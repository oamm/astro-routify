import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok } from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Middleware System', () => {
    it('should execute global middlewares in order', async () => {
        const builder = new RouterBuilder();
        const logs: string[] = [];

        builder.use(async (ctx, next) => {
            logs.push('mw1-before');
            const res = await next();
            logs.push('mw1-after');
            return res;
        });

        builder.use(async (ctx, next) => {
            logs.push('mw2-before');
            const res = await next();
            logs.push('mw2-after');
            return res;
        });

        builder.addGet('/test', () => {
            logs.push('handler');
            return ok('ok');
        });

        const router = builder.build();
        await router(createContext('http://localhost/api/test', 'GET'));

        expect(logs).toEqual(['mw1-before', 'mw2-before', 'handler', 'mw2-after', 'mw1-after']);
    });

    it('should support group-level middlewares', async () => {
        const builder = new RouterBuilder();
        const logs: string[] = [];

        builder.group('/admin', (group) => {
            group.use(async (ctx, next) => {
                logs.push('admin-mw');
                return next();
            });
            
            group.addGet('/dashboard', () => {
                logs.push('dashboard');
                return ok('dashboard');
            });
        });

        builder.addGet('/public', () => {
            logs.push('public');
            return ok('public');
        });

        const router = builder.build();
        
        await router(createContext('http://localhost/api/admin/dashboard', 'GET'));
        expect(logs).toEqual(['admin-mw', 'dashboard']);
        
        logs.length = 0;
        await router(createContext('http://localhost/api/public', 'GET'));
        expect(logs).toEqual(['public']);
    });

    it('should allow middleware to short-circuit the request', async () => {
        const builder = new RouterBuilder();
        builder.use(async (ctx, next) => {
            return ok('short-circuited');
        });

        builder.addGet('/test', () => ok('should not reach here'));

        const router = builder.build();
        const res = await router(createContext('http://localhost/api/test', 'GET'));
        expect(await res.text()).toBe('short-circuited');
    });
});
