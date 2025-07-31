import {defineRouter, ok, defineRoute, HttpMethod, notFound, fileResponse} from '../dist';
import type {APIContext} from 'astro';
import {describe, it, expect, vi} from 'vitest';

describe('defineRouter - basePath handling', () => {
    it('should match the route and strip basePath correctly', async () => {
        const testHandler = vi.fn(() => ok({success: true}));

        const routes = [
            defineRoute(HttpMethod.GET, '/test', testHandler),
        ];

        const router = defineRouter(routes, {basePath: '/custom-api'});

        const mockRequest = new Request('http://localhost/custom-api/test', {
            method: 'GET',
        });

        const ctx = {
            request: mockRequest,
            params: {},
        } as unknown as APIContext;

        const response = await router(ctx);
        const json = await response.json();

        expect(testHandler).toHaveBeenCalled();
        expect(json).toEqual({success: true});
    });

    it('should match a nested route', async () => {
        const nestedHandler = vi.fn(() => ok({route: 'nested'}));

        const routes = [
            defineRoute(HttpMethod.GET, '/v1/items/list', nestedHandler),
        ];

        const router = defineRouter(routes, {basePath: '/custom-api'});

        const mockRequest = new Request('http://localhost/custom-api/v1/items/list', {
            method: 'GET',
        });

        const ctx = {request: mockRequest, params: {}} as unknown as APIContext;

        const response = await router(ctx);
        const json = await response.json();

        expect(nestedHandler).toHaveBeenCalled();
        expect(json).toEqual({route: 'nested'});
    });

    it('should handle dynamic parameters', async () => {
        const paramHandler = vi.fn((ctx) => ok({id: ctx.params.id}));

        const routes = [
            defineRoute(HttpMethod.GET, '/users/:id', paramHandler),
        ];

        const router = defineRouter(routes, {basePath: '/custom-api'});

        const mockRequest = new Request('http://localhost/custom-api/users/42', {
            method: 'GET',
        });

        const ctx = {request: mockRequest, params: {}} as unknown as APIContext;

        const response = await router(ctx);
        const json = await response.json();

        expect(paramHandler).toHaveBeenCalled();
        expect(json).toEqual({id: '42'});
    });

    it('should match a route with trailing slash', async () => {
        const slashHandler = vi.fn(() => ok({trailing: true}));

        const routes = [
            defineRoute(HttpMethod.GET, '/trailing/', slashHandler),
        ];

        const router = defineRouter(routes, {basePath: '/custom-api'});

        const mockRequest = new Request('http://localhost/custom-api/trailing/', {
            method: 'GET',
        });

        const ctx = {request: mockRequest, params: {}} as unknown as APIContext;

        const response = await router(ctx);
        const json = await response.json();

        expect(slashHandler).toHaveBeenCalled();
        expect(json).toEqual({trailing: true});
    });

    it('should return notFound for unmatched route', async () => {
        const handler = vi.fn(() => ok({}));

        const routes = [
            defineRoute(HttpMethod.GET, '/exists', handler),
        ];

        const router = defineRouter(routes, {basePath: '/custom-api', onNotFound: () => notFound('not found')});

        const mockRequest = new Request('http://localhost/custom-api/does-not-exist', {
            method: 'GET',
        });

        const ctx = {request: mockRequest, params: {}} as unknown as APIContext;

        const response = await router(ctx);
        expect(response.status).toBe(404);
        const text = await response.text();
        expect(text).toContain('not found');
    });

    it('should work with default basePath (/api)', async () => {
        const defaultHandler = vi.fn(() => ok({ defaultBase: true }));

        const routes = [
            defineRoute(HttpMethod.GET, '/hello', defaultHandler),
        ];

        const router = defineRouter(routes); // No options provided, should default to /api

        const mockRequest = new Request('http://localhost/api/hello', {
            method: 'GET',
        });

        const ctx = { request: mockRequest, params: {} } as unknown as APIContext;

        const response = await router(ctx);
        const json = await response.json();

        expect(defaultHandler).toHaveBeenCalled();
        expect(json).toEqual({ defaultBase: true });
    });

    it('should return a file with correct headers and content', async () => {
        const pdfContent = new Blob([Uint8Array.from([0x25, 0x50, 0x44, 0x46])], {
            type: 'application/pdf',
        });

        const fileHandler = vi.fn(() =>
            fileResponse(pdfContent, 'application/pdf', 'document.pdf')
        );

        const routes = [defineRoute(HttpMethod.GET, '/download', fileHandler)];

        const router = defineRouter(routes, {basePath: '/api'});

        const mockRequest = new Request('http://localhost/api/download', {
            method: 'GET',
        });

        const ctx = {request: mockRequest, params: {}} as unknown as APIContext;

        const response = await router(ctx);

        expect(fileHandler).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('application/pdf');
        expect(response.headers.get('Content-Disposition')).toBe(
            'attachment; filename="document.pdf"'
        );
        const buffer = await response.arrayBuffer();
        expect(new Uint8Array(buffer)).toEqual(Uint8Array.from([0x25, 0x50, 0x44, 0x46]));
    });
});

