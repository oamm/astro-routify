import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok, validate } from '../src';

describe('Validation Middleware', () => {
    const schema = {
        body: {
            safeParse: (data: any) => {
                if (data.name) return { success: true, data };
                return { success: false, error: 'Name is required' };
            }
        }
    };

    it('should accept valid request body', async () => {
        const builder = new RouterBuilder();
        builder.addPost('/user', validate(schema), (ctx) => {
            return ok({ name: ctx.data.body.name });
        });

        const router = builder.build();
        const res = await router({
            request: new Request('http://localhost/api/user', {
                method: 'POST',
                body: JSON.stringify({ name: 'Alex' }),
                headers: { 'Content-Type': 'application/json' }
            }),
            params: {}
        } as any);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ name: 'Alex' });
    });

    it('should reject invalid request body with 400', async () => {
        const builder = new RouterBuilder();
        builder.addPost('/user', validate(schema), () => ok('ok'));

        const router = builder.build();
        const res = await router({
            request: new Request('http://localhost/api/user', {
                method: 'POST',
                body: JSON.stringify({ age: 30 }),
                headers: { 'Content-Type': 'application/json' }
            }),
            params: {}
        } as any);

        expect(res.status).toBe(400);
        const body = await res.json() as any;
        expect(body.error).toBe('Invalid request body');
    });

    it('should validate query parameters', async () => {
        const querySchema = {
            query: {
                safeParse: (data: any) => {
                    if (data.id) return { success: true, data };
                    return { success: false, error: 'ID is required' };
                }
            }
        };

        const builder = new RouterBuilder();
        builder.addGet('/search', validate(querySchema), (ctx) => ok(ctx.data.query));

        const router = builder.build();
        
        // Valid
        const res1 = await router({
            request: new Request('http://localhost/api/search?id=123'),
            params: {}
        } as any);
        expect(res1.status).toBe(200);
        expect(await res1.json()).toEqual({ id: '123' });

        // Invalid
        const res2 = await router({
            request: new Request('http://localhost/api/search'),
            params: {}
        } as any);
        expect(res2.status).toBe(400);
    });
});
