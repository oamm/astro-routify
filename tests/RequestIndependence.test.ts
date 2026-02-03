import { describe, it, expect } from 'vitest';
import type { APIContext } from 'astro';
import { RouterBuilder, ok } from '../src';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Request Independence', () => {
    it('should maintain independent params for concurrent requests', async () => {
        const builder = new RouterBuilder();
        
        // A handler that waits a bit to simulate async work and increase chance of race conditions
        const handler = async (ctx: APIContext) => {
            const id = ctx.params.id;
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
            // Check if id is still what it was supposed to be
            return ok({ id });
        };

        builder.addGet('/users/:id', handler);
        const router = builder.build();

        const requests = Array.from({ length: 50 }, async (_, i) => {
            const id = `user-${i}`;
            const ctx = createContext(`http://localhost/api/users/${id}`, 'GET');
            const res = await router(ctx);
            const body = await res.json() as any;
            return { expected: id, actual: body.id };
        });

        const results = await Promise.all(requests);
        
        for (const result of results) {
            expect(result.actual).toBe(result.expected);
        }
    });

    it('should not leak ctx.params between different routes', async () => {
        const builder = new RouterBuilder();
        
        builder.addGet('/a/:id', (ctx) => ok({ route: 'a', id: ctx.params.id }));
        builder.addGet('/b/:name', (ctx) => ok({ route: 'b', name: ctx.params.name }));
        
        const router = builder.build();

        const resA = await router(createContext('http://localhost/api/a/123', 'GET'));
        const bodyA = await resA.json() as any;
        
        const resB = await router(createContext('http://localhost/api/b/joe', 'GET'));
        const bodyB = await resB.json() as any;

        expect(bodyA.id).toBe('123');
        expect(bodyA.name).toBeUndefined();
        
        expect(bodyB.name).toBe('joe');
        expect(bodyB.id).toBeUndefined();
    });

    it('should preserve original ctx.params if they existed', async () => {
        const builder = new RouterBuilder();
        
        builder.addGet('/users/:id', (ctx) => ok({ 
            id: ctx.params.id, 
            extra: (ctx.params as any).extra 
        }));
        
        const router = builder.build();

        const ctx = createContext('http://localhost/api/users/123', 'GET');
        (ctx.params as any).extra = 'preserved';
        
        const res = await router(ctx);
        const body = await res.json() as any;

        expect(body.id).toBe('123');
        expect(body.extra).toBe('preserved');
    });

    it('should not mix response headers between concurrent requests', async () => {
        const builder = new RouterBuilder();
        
        builder.addGet('/headers/:val', (ctx) => {
            const val = ctx.params.val;
            return ok({ val }, { 'X-Test-Val': val! });
        });
        
        const router = builder.build();

        const requests = Array.from({ length: 20 }, async (_, i) => {
            const val = `val-${i}`;
            const ctx = createContext(`http://localhost/api/headers/${val}`, 'GET');
            const res = await router(ctx);
            return {
                expected: val,
                actualHeader: res.headers.get('X-Test-Val'),
                actualStatus: res.status
            };
        });

        const results = await Promise.all(requests);
        
        for (const result of results) {
            expect(result.actualHeader).toBe(result.expected);
            expect(result.actualStatus).toBe(200);
        }
    });

    it('should handle sequential requests to different methods on same path independently', async () => {
        const builder = new RouterBuilder();
        
        builder.addGet('/item', () => ok('get-item'));
        builder.addPost('/item', () => ok('post-item'));
        
        const router = builder.build();

        const resGet = await router(createContext('http://localhost/api/item', 'GET'));
        expect(await resGet.text()).toBe('get-item');

        const resPost = await router(createContext('http://localhost/api/item', 'POST'));
        expect(await resPost.text()).toBe('post-item');

        const resDelete = await router(createContext('http://localhost/api/item', 'DELETE'));
        expect(resDelete.status).toBe(405);
    });
});
