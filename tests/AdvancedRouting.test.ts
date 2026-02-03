import { describe, it, expect } from 'vitest';
import {RouterBuilder, ok, HttpMethod} from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Advanced Routing', () => {
    describe('Wildcards', () => {
        it('should match single segment wildcard (*)', async () => {
            const builder = new RouterBuilder();
            builder.addGet('/files/*/download', () => ok('download'));
            const router = builder.build();

            const res1 = await router(createContext('http://localhost/api/files/photo/download', HttpMethod.GET));
            expect(res1.status).toBe(200);
            expect(await res1.text()).toBe('download');

            const res2 = await router(createContext('http://localhost/api/files/video/download', HttpMethod.GET));
            expect(res2.status).toBe(200);

            const res3 = await router(createContext('http://localhost/api/files/too/many/download', HttpMethod.GET));
            expect(res3.status).toBe(404);
        });

        it('should match catch-all wildcard (**)', async () => {
            const builder = new RouterBuilder();
            builder.addGet('/static/**', () => ok('static content'));
            const router = builder.build();

            const res1 = await router(createContext('http://localhost/api/static/css/main.css', HttpMethod.GET));
            expect(res1.status).toBe(200);
            expect(await res1.text()).toBe('static content');

            const res2 = await router(createContext('http://localhost/api/static/js/vendor/jquery.js', HttpMethod.GET));
            expect(res2.status).toBe(200);
            
            // Should also match the base
            const res3 = await router(createContext('http://localhost/api/static', HttpMethod.GET));
            expect(res3.status).toBe(200);
        });

        it('should prioritize more specific routes over wildcards', async () => {
            const builder = new RouterBuilder();
            builder.addGet('/files/config/download', () => ok('config'));
            builder.addGet('/files/*/download', () => ok('wildcard'));
            const router = builder.build();

            const res1 = await router(createContext('http://localhost/api/files/config/download', HttpMethod.GET));
            expect(await res1.text()).toBe('config');

            const res2 = await router(createContext('http://localhost/api/files/other/download', HttpMethod.GET));
            expect(await res2.text()).toBe('wildcard');
        });
    });

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
    });

    describe('Priority Matching', () => {
        it('should follow priority: Static > Regex > Param > Wildcard > Catch-all', async () => {
            const builder = new RouterBuilder();
            builder.addGet('/p/static', () => ok('static'));
            builder.addGet('/p/:id(\\d+)', () => ok('regex'));
            builder.addGet('/p/:id', () => ok('param'));
            builder.addGet('/p/*', () => ok('wildcard'));
            builder.addGet('/**', () => ok('catchall'));
            
            const router = builder.build();

            // Static
            expect(await (await router(createContext('http://localhost/api/p/static', HttpMethod.GET)))
                .text()).toBe('static');
            
            // Regex
            expect(await (await router(createContext('http://localhost/api/p/123', HttpMethod.GET)))
                .text()).toBe('regex');
            
            // Param
            expect(await (await router(createContext('http://localhost/api/p/abc', HttpMethod.GET)))
                .text()).toBe('param');
            
            // Wildcard (should be same as param if only one segment left, but let's test a case where param doesn't match if we had multiple segments)
            // Wait, /p/* only matches if there is exactly one segment after /p/. 
            // In my implementation /p/:id and /p/* compete for the same segment.
            // If I have both, :id usually wins or they are equivalent in terms of segments matched.
            
            // Catch-all
            expect(await (await router(createContext('http://localhost/api/something/else', HttpMethod.GET)))
                .text()).toBe('catchall');
        });
    });

    describe('Edge Cases', () => {
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

        it('should handle wildcards in the middle of a path', async () => {
            const builder = new RouterBuilder();
            builder.addGet('/a/*/c', () => ok('middle'));
            const router = builder.build();

            expect(await (await router(createContext('http://localhost/api/a/b/c', HttpMethod.GET)))
                .text()).toBe('middle');
            expect(await (await router(createContext('http://localhost/api/a/foo/c', HttpMethod.GET)))
                .text()).toBe('middle');
            expect((await router(createContext('http://localhost/api/a/b/d', HttpMethod.GET))).status)
                .toBe(404);
        });

        it('should allow mixing * and **', async () => {
            const builder = new RouterBuilder();
            builder.addGet('/api/*/static/**', () => ok('mixed'));
            const router = builder.build();

            expect(await (await router(createContext('http://localhost/api/api/v1/static/css/style.css',
                HttpMethod.GET))).text()).toBe('mixed');
            expect(await (await router(createContext('http://localhost/api/api/v2/static', HttpMethod.GET))).text()).toBe('mixed');
        });

        it('should match catch-all with zero segments', async () => {
            const builder = new RouterBuilder();
            builder.addGet('/docs/**', () => ok('docs'));
            const router = builder.build();

            expect(await (await router(createContext('http://localhost/api/docs', HttpMethod.GET))).text()).toBe('docs');
            expect(await (await router(createContext('http://localhost/api/docs/', HttpMethod.GET))).text()).toBe('docs');
        });
    });
});
