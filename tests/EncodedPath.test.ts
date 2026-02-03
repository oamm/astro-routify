import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok } from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Encoded Path Matching', () => {
    it('should match encoded path segments correctly', async () => {
        const builder = new RouterBuilder();
        builder.addGet('/my path', () => ok('matched space'));
        builder.addGet('/users/:name', (ctx) => ok({ name: ctx.params.name }));

        const router = builder.build();
        
        // 1. Match literal space
        const res1 = await router(createContext('http://localhost/api/my%20path', 'GET'));
        expect(res1.status).toBe(200);
        expect(await res1.text()).toBe('matched space');

        // 2. Match encoded param
        const res2 = await router(createContext('http://localhost/api/users/Alex%20Mora', 'GET'));
        expect(res2.status).toBe(200);
        expect(await res2.json()).toEqual({ name: 'Alex Mora' });
    });
});
