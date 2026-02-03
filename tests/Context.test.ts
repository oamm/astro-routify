import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok } from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('RoutifyContext', () => {
    it('should provide parsed query parameters in ctx.query', async () => {
        const builder = new RouterBuilder();
        builder.addGet('/search', (ctx) => {
            return ok({ query: ctx.query });
        });

        const router = builder.build();
        const ctx = createContext('http://localhost/api/search?q=astro&sort=desc', 'GET');
        const res = await router(ctx);
        const body = await res.json() as any;

        expect(body.query).toEqual({ q: 'astro', sort: 'desc' });
    });

    it('should provide an empty data object in ctx.data', async () => {
        const builder = new RouterBuilder();
        builder.addGet('/data', (ctx) => {
            return ok({ hasData: !!ctx.data });
        });

        const router = builder.build();
        const res = await router(createContext('http://localhost/api/data', 'GET'));
        const body = await res.json() as any;

        expect(body.hasData).toBe(true);
    });
});
