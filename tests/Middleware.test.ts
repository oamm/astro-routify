import { describe, it, expect } from 'vitest';
import { RouterBuilder, cors, ok } from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Middleware System', () => {
    it('does not reflect arbitrary origins when credentials are enabled', async () => {
        const builder = new RouterBuilder();
        builder.use(cors({credentials: true}));
        builder.addGet('/cors', () => ok('ok'));
        const router = builder.build();

        const res = await router({
            request: new Request('http://localhost/api/cors', {
                headers: {Origin: 'https://attacker.example'},
            }),
            params: {},
        } as unknown as APIContext);

        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('allows only configured credentialed origins', async () => {
        const builder = new RouterBuilder();
        builder.use(cors({origin: 'https://app.example', credentials: true}));
        builder.addGet('/cors', () => ok('ok'));
        const router = builder.build();

        const res = await router({
            request: new Request('http://localhost/api/cors', {
                headers: {Origin: 'https://app.example'},
            }),
            params: {},
        } as unknown as APIContext);

        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('handles CORS preflight without an explicit OPTIONS route', async () => {
        const builder = new RouterBuilder();
        builder.use(cors({origin: 'https://app.example'}));
        builder.addGet('/cors', () => ok('ok'));
        const router = builder.build();

        const res = await router({
            request: new Request('http://localhost/api/cors', {
                method: 'OPTIONS',
                headers: {
                    Origin: 'https://app.example',
                    'Access-Control-Request-Method': 'GET',
                },
            }),
            params: {},
        } as unknown as APIContext);

        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
    });

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
