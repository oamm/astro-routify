import type { APIContext } from 'astro';
import { describe, expect, it, vi } from 'vitest';
import { RouterBuilder, cors, defineRoute, HttpMethod, ok, validate } from '../src';

const createContext = (
    path: string,
    init: RequestInit = {}
): APIContext =>
    ({
        request: new Request(`http://localhost/api${path}`, init),
        params: {},
    } as unknown as APIContext);

describe('OPTIONS preflight handling', () => {
    it('returns 204 with Allow for an automatic OPTIONS route on DELETE', async () => {
        const builder = new RouterBuilder();
        builder.addDelete('/users/:id', () => ok('deleted'));
        const router = builder.build();

        const res = await router(createContext('/users/123', { method: 'OPTIONS' }));

        expect(res.status).toBe(204);
        expect(res.headers.get('Allow')).toBe('DELETE, OPTIONS');
    });

    it('returns 204 with Allow for an automatic OPTIONS route on PATCH', async () => {
        const builder = new RouterBuilder();
        builder.addPatch('/users/:id', () => ok('patched'));
        const router = builder.build();

        const res = await router(createContext('/users/123', { method: 'OPTIONS' }));

        expect(res.status).toBe(204);
        expect(res.headers.get('Allow')).toBe('PATCH, OPTIONS');
    });

    it('aggregates methods for the same path into a single automatic OPTIONS response', async () => {
        const builder = new RouterBuilder();
        builder.addGet('/users/:id', () => ok('user'));
        builder.addPatch('/users/:id', () => ok('patched'));
        builder.addDelete('/users/:id', () => ok('deleted'));
        const router = builder.build();

        const res = await router(createContext('/users/123', { method: 'OPTIONS' }));

        expect(res.status).toBe(204);
        expect(res.headers.get('Allow')).toBe('GET, PATCH, DELETE, OPTIONS');
    });

    it('does not duplicate OPTIONS in the automatic Allow header', async () => {
        const builder = new RouterBuilder();
        builder.addGet('/users/:id', () => ok('user'));
        builder.addPatch('/users/:id', () => ok('patched'));
        builder.addDelete('/users/:id', () => ok('deleted'));
        const router = builder.build();

        const res = await router(createContext('/users/123', { method: 'OPTIONS' }));
        const allow = res.headers.get('Allow')?.split(', ').filter(method => method === 'OPTIONS');

        expect(allow).toHaveLength(1);
    });

    it('lets an explicit OPTIONS route override the automatic fallback', async () => {
        const builder = new RouterBuilder();
        builder.addDelete('/users/:id', () => ok('deleted'));
        builder.addRoute(defineRoute({
            method: HttpMethod.OPTIONS,
            path: '/users/:id',
            handler: () => ok('explicit options', { Allow: 'OPTIONS' }),
        }));
        const router = builder.build();

        const res = await router(createContext('/users/123', { method: 'OPTIONS' }));

        expect(res.status).toBe(200);
        expect(await res.text()).toBe('explicit options');
        expect(res.headers.get('Allow')).toBe('OPTIONS');
    });

    it('allows CORS middleware to handle browser preflight before later middleware', async () => {
        const auth = vi.fn(() => ok('unauthorized', { 'X-Auth-Called': 'true' }));
        const builder = new RouterBuilder();
        builder.use(cors({ origin: 'https://app.example.com' }));
        builder.use(auth);
        builder.addDelete('/users/:id', () => ok('deleted'));
        const router = builder.build();

        const res = await router(createContext('/users/123', {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://app.example.com',
                'Access-Control-Request-Method': 'DELETE',
                'Access-Control-Request-Headers': 'authorization,content-type',
            },
        }));

        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
        expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,PUT,PATCH,DELETE,OPTIONS');
        expect(res.headers.get('Access-Control-Allow-Headers')).toBe('authorization,content-type');
        expect(auth).not.toHaveBeenCalled();
    });

    it('handles Authorization in Access-Control-Request-Headers', async () => {
        const builder = new RouterBuilder();
        builder.use(cors({ origin: 'https://app.example.com' }));
        builder.addDelete('/users/:id', () => ok('deleted'));
        const router = builder.build();

        const res = await router(createContext('/users/123', {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://app.example.com',
                'Access-Control-Request-Method': 'DELETE',
                'Access-Control-Request-Headers': 'authorization',
            },
        }));

        expect(res.headers.get('Access-Control-Allow-Headers')).toBe('authorization');
    });

    it('handles Content-Type in Access-Control-Request-Headers', async () => {
        const builder = new RouterBuilder();
        builder.use(cors({ origin: 'https://app.example.com' }));
        builder.addDelete('/users/:id', () => ok('deleted'));
        const router = builder.build();

        const res = await router(createContext('/users/123', {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://app.example.com',
                'Access-Control-Request-Method': 'DELETE',
                'Access-Control-Request-Headers': 'content-type',
            },
        }));

        expect(res.headers.get('Access-Control-Allow-Headers')).toBe('content-type');
    });

    it('does not emit wildcard origin when credentials are enabled', async () => {
        const builder = new RouterBuilder();
        builder.use(cors({ credentials: true }));
        builder.addDelete('/users/:id', () => ok('deleted'));
        const router = builder.build();

        const res = await router(createContext('/users/123', {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://app.example.com',
                'Access-Control-Request-Method': 'DELETE',
            },
        }));

        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    });

    it('preserves middleware ordering for automatic OPTIONS fallback', async () => {
        const logs: string[] = [];
        const builder = new RouterBuilder();
        builder.use(async (_ctx, next) => {
            logs.push('global-before');
            const res = await next();
            logs.push(`global-after-${res.status}`);
            return res;
        });
        builder.addDelete(
            '/users/:id',
            async (_ctx, next) => {
                logs.push('route-before');
                const res = await next();
                logs.push(`route-after-${res.status}`);
                return res;
            },
            () => ok('deleted')
        );
        const router = builder.build();

        const res = await router(createContext('/users/123', { method: 'OPTIONS' }));

        expect(res.status).toBe(204);
        expect(logs).toEqual([
            'global-before',
            'route-before',
            'route-after-204',
            'global-after-204',
        ]);
    });
});

describe('empty request bodies', () => {
    it('accepts POST without a request body when no body validation is configured', async () => {
        const handler = vi.fn(() => ok('activated'));
        const builder = new RouterBuilder();
        builder.addPost('/users/:id/activate', handler);
        const router = builder.build();

        const res = await router(createContext('/users/123/activate', {
            method: 'POST',
            headers: { 'Content-Length': '0' },
        }));

        expect(res.status).toBe(200);
        expect(await res.text()).toBe('activated');
        expect(handler).toHaveBeenCalled();
    });

    it('accepts DELETE without a request body when no body validation is configured', async () => {
        const handler = vi.fn(() => ok('deleted'));
        const builder = new RouterBuilder();
        builder.addDelete('/users/:id', handler);
        const router = builder.build();

        const res = await router(createContext('/users/123', {
            method: 'DELETE',
            headers: { 'Content-Length': '0' },
        }));

        expect(res.status).toBe(200);
        expect(await res.text()).toBe('deleted');
        expect(handler).toHaveBeenCalled();
    });

    it('rejects missing body when body validation is configured', async () => {
        const builder = new RouterBuilder();
        builder.addPost(
            '/users',
            validate({
                body: {
                    safeParse: (data: any) =>
                        data?.name
                            ? { success: true, data }
                            : { success: false, error: 'Name is required' },
                },
            }),
            () => ok('created')
        );
        const router = builder.build();

        const res = await router(createContext('/users', {
            method: 'POST',
            headers: { 'Content-Length': '0' },
        }));

        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
    });
});
