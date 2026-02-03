import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok, HttpMethod } from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Regex Constraints', () => {
    it('should match regex-constrained parameters', async () => {
        const builder = new RouterBuilder();
        // Match only numeric IDs
        builder.addGet('/users/:id(\\d+)', (ctx) => ok(`user id: ${ctx.params.id}`));
        const router = builder.build();

        const res1 = await router(createContext('http://localhost/api/users/123', HttpMethod.GET));
        expect(res1.status).toBe(200);
        expect(await res1.text()).toBe('user id: 123');

        const res2 = await router(createContext('http://localhost/api/users/abc', HttpMethod.GET));
        expect(res2.status).toBe(404);
    });

    it('should handle complex regex', async () => {
        const builder = new RouterBuilder();
        // Match hex color (3 or 6 chars)
        builder.addGet('/color/:hex(^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$)', (ctx) => ok(`hex: ${ctx.params.hex}`));
        const router = builder.build();

        const res1 = await router(createContext('http://localhost/api/color/ff0000', HttpMethod.GET));
        expect(res1.status).toBe(200);
        
        const res2 = await router(createContext('http://localhost/api/color/fff', HttpMethod.GET));
        expect(res2.status).toBe(200);

        const res3 = await router(createContext('http://localhost/api/color/red', HttpMethod.GET));
        expect(res3.status).toBe(404);
    });

    it('should handle multiple regex params in one path', async () => {
        const builder = new RouterBuilder();
        builder.addGet('/v1/:year(\\d{4})/:month(\\d{2})', (ctx) => ok({
            year: ctx.params.year,
            month: ctx.params.month
        }));
        const router = builder.build();

        const res = await router(createContext('http://localhost/api/v1/2024/05', HttpMethod.GET));
        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.year).toBe('2024');
        expect(body.month).toBe('05');

        const resFail = await router(createContext('http://localhost/api/v1/2024/may', HttpMethod.GET));
        expect(resFail.status).toBe(404);
    });
});
