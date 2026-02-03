import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok, HttpMethod } from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Wildcard Matching', () => {
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
