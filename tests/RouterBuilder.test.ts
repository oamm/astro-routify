import {describe, it, expect, vi} from 'vitest';
import type {APIContext} from 'astro';
import {RouterBuilder, HttpMethod, defineRoute, defineGroup, ok, createRouter} from "../src";

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, {method}),
        params: {},
    } as unknown as APIContext);

describe('RouterBuilder', () => {
    it('should build and route with addGet', async () => {
        const builder = new RouterBuilder();
        const handler = vi.fn(() => ok('pong'));
        builder.addGet('/ping', handler);

        const router = builder.build();
        const ctx = createContext('http://localhost/api/ping', 'GET');
        const res = await router(ctx);
        const text = await res.text();

        expect(handler).toHaveBeenCalled();
        expect(text).toBe('pong');
    });

    it('should build and route with addPost', async () => {
        const builder = new RouterBuilder();
        const handler = vi.fn(() => ok('posted'));
        builder.addPost('/submit', handler);

        const router = builder.build();
        const ctx = createContext('http://localhost/api/submit', 'POST');
        const res = await router(ctx);
        const text = await res.text();

        expect(handler).toHaveBeenCalled();
        expect(text).toBe('posted');
    });

    it('should support route groups via addGroup', async () => {
        const groupHandler = vi.fn(() => ok('grouped'));
        const group = defineGroup('/group').addGet('/test', groupHandler);

        const builder = new RouterBuilder();
        builder.addGroup(group);
        const router = builder.build();

        const ctx = createContext('http://localhost/api/group/test', 'GET');
        const res = await router(ctx);
        const text = await res.text();

        expect(groupHandler).toHaveBeenCalled();
        expect(text).toBe('grouped');
    });

    it('should build and route with addRoute manually', async () => {
        const manualHandler = vi.fn(() => ok('manual'));
        const route = defineRoute(HttpMethod.GET, '/manual', manualHandler);

        const builder = new RouterBuilder();
        builder.addRoute(route);
        const router = builder.build();

        const ctx = createContext('http://localhost/api/manual', 'GET');
        const res = await router(ctx);
        const text = await res.text();

        expect(manualHandler).toHaveBeenCalled();
        expect(text).toBe('manual');
    });

    it('should handle unmatched route as 404', async () => {
        const builder = new RouterBuilder();
        const router = builder.build();

        const ctx = createContext('http://localhost/api/unknown', 'GET');
        const res = await router(ctx);

        expect(res.status).toBe(404);
    });

    it('should show warning when using deprecated register()', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {
        });
        const builder = new RouterBuilder();
        const dummyHandler = vi.fn(() => ok('legacy'));
        const route = defineRoute(HttpMethod.GET, '/legacy', dummyHandler);

        builder.register(route);
        builder.register([route]);

        expect(spy).toHaveBeenCalledOnce();
        spy.mockRestore();
    });

    it('should register routes from modules using addModules', async () => {
        const handler1 = vi.fn(() => ok('route1'));
        const handler2 = vi.fn(() => ok('route2'));
        const route1 = defineRoute(HttpMethod.GET, '/route1', handler1);
        const group1 = defineGroup('/group1').addGet('/sub1', handler2);

        const mockModules = {
            './file1.ts': {
                default: route1,
                namedGroup: group1
            }
        };

        const builder = new RouterBuilder({basePath: '/api'});
        builder.addModules(mockModules);
        const router = builder.build();

        let res = await router(createContext('http://localhost/api/route1', 'GET'));
        expect(await res.text()).toBe('route1');
        res = await router(createContext('http://localhost/api/group1/sub1', 'GET'));
        expect(await res.text()).toBe('route2');
    });

    it('should use createRouter helper', async () => {
        const route = defineRoute(HttpMethod.GET, '/auto', () => ok('auto'));
        const router = createRouter({'./f.ts': {route}}, {basePath: '/api'});
        const res = await router(createContext('http://localhost/api/auto', 'GET'));
        expect(await res.text()).toBe('auto');
    });

    it('should log routes in development mode', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {
        });
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const builder = new RouterBuilder();
        builder.addGet('/test', () => ok('ok'));
        builder.build();

        expect(spy.mock.calls[0][0]).toMatch(/\[RouterBuilder\].*Registered routes:/);
        expect(spy.mock.calls[1][0]).toMatch(/GET/);

        process.env.NODE_ENV = originalEnv;
        spy.mockRestore();
    });

    it('should trace matches in debug mode', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {
        });
        const builder = new RouterBuilder({debug: true});
        builder.addGet('/debug', () => ok('ok'));
        const router = builder.build();

        await router(createContext('http://localhost/api/debug', 'GET'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[RouterBuilder] GET /debug -> matched'));
        spy.mockRestore();
    });
});
