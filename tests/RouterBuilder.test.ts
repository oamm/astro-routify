import {describe, it, expect, vi} from 'vitest';
import type {APIContext} from 'astro';
import {RouterBuilder, HttpMethod, defineRoute, defineGroup, ok} from "../dist";

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
        builder.register([route]); // call twice to ensure only one warning

        expect(spy).toHaveBeenCalledOnce();
        spy.mockRestore();
    });
});
