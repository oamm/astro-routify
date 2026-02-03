import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok, HttpMethod } from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Priority Matching', () => {
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
        
        // Catch-all
        expect(await (await router(createContext('http://localhost/api/something/else', HttpMethod.GET)))
            .text()).toBe('catchall');
    });
});
