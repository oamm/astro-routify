import { describe, it, expect } from 'vitest';
import { RouterBuilder, json } from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Error Handling', () => {
    it('should use custom onError handler when provided', async () => {
        const builder = new RouterBuilder({
            onError: (err, ctx) => {
                return json({ caught: (err as Error).message, path: new URL(ctx.request.url).pathname }, 500);
            }
        });

        builder.addGet('/error', () => {
            throw new Error('Boom');
        });

        const router = builder.build();
        const res = await router(createContext('http://localhost/api/error', 'GET'));
        
        expect(res.status).toBe(500);
        const body = await res.json() as any;
        expect(body.caught).toBe('Boom');
        expect(body.path).toBe('/api/error');
    });

    it('should fallback to default error handling if no onError is provided', async () => {
        const builder = new RouterBuilder();
        builder.addGet('/error', () => {
            throw new Error('Default Error');
        });

        const router = builder.build();
        // defineHandler catches it and returns 500
        const res = await router(createContext('http://localhost/api/error', 'GET'));
        expect(res.status).toBe(500);
    });
});
