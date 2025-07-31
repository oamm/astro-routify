import {defineGroup, RouterBuilder, ok, notFound} from '../dist';
import type {APIContext} from 'astro';
import {describe, it, expect, vi} from 'vitest';

describe('RouterBuilder + defineGroup - route handling', () => {
    it('should match a group route and return correct response', async () => {
        const handler = vi.fn(() => ok({user: 'alex'}));

        const group = defineGroup('/users').addGet('/:id', handler);

        const router = new RouterBuilder({basePath: '/api'}).addGroup(group);

        const mockRequest = new Request('http://localhost/api/users/123', {
            method: 'GET',
        });

        const ctx = {request: mockRequest, params: {}} as unknown as APIContext;
        const response = await router.build()(ctx);
        const json = await response.json();

        expect(handler).toHaveBeenCalled();
        expect(json).toEqual({user: 'alex'});
    });

    it('should return 404 for unmatched group route', async () => {
        const group = defineGroup('/admin').addGet('/dashboard', () => ok('admin'));

        const router = new RouterBuilder({basePath: '/api'}).addGroup(group);

        const mockRequest = new Request('http://localhost/api/unknown', {
            method: 'GET',
        });

        const ctx = {request: mockRequest, params: {}} as unknown as APIContext;
        const response = await router.build()(ctx);

        expect(response.status).toBe(404);
    });

    it('should return 405 for method not allowed in group', async () => {
        const handler = vi.fn(() => ok('GET allowed'));

        const group = defineGroup('/auth').addGet('/login', handler);

        const router = new RouterBuilder({basePath: '/api'}).addGroup(group);

        const mockRequest = new Request('http://localhost/api/auth/login', {
            method: 'POST',
        });

        const ctx = {request: mockRequest, params: {}} as unknown as APIContext;
        const response = await router.build()(ctx);

        expect(response.status).toBe(405);
        expect(response.headers.get('Allow')).toBe('GET');
    });

    it('should match a route with trailing slash in group', async () => {
        const handler = vi.fn(() => ok({trailing: true}));

        const group = defineGroup('/data').addGet('/sync/', handler);

        const router = new RouterBuilder({basePath: '/api'}).addGroup(group);

        const mockRequest = new Request('http://localhost/api/data/sync/', {
            method: 'GET',
        });

        const ctx = {request: mockRequest, params: {}} as unknown as APIContext;
        const response = await router.build()(ctx);
        const json = await response.json();

        expect(handler).toHaveBeenCalled();
        expect(json).toEqual({trailing: true});
    });

    it('should match multiple groups and route to correct handler', async () => {
        const userHandler = vi.fn(() => ok('user'));
        const postHandler = vi.fn(() => ok('post'));

        const users = defineGroup('/users').addGet('/:id', userHandler);
        const posts = defineGroup('/posts').addGet('/:slug', postHandler);

        const router = new RouterBuilder({basePath: '/api'})
            .addGroup(users)
            .addGroup(posts);

        const userRequest = new Request('http://localhost/api/users/42', {method: 'GET'});
        const postRequest = new Request('http://localhost/api/posts/hello', {method: 'GET'});

        const ctx1 = {request: userRequest, params: {}} as unknown as APIContext;
        const ctx2 = {request: postRequest, params: {}} as unknown as APIContext;

        const route = router.build();

        const res1 = await route(ctx1);
        const res2 = await route(ctx2);

        expect(await res1.text()).toBe('user');
        expect(await res2.text()).toBe('post');
    });

    it('should work with custom notFound handler in builder', async () => {
        const group = defineGroup('/products').addGet('/list', () => ok('list'));

        const router = new RouterBuilder({
            basePath: '/api',
            onNotFound: () => notFound('not here'),
        }).addGroup(group);

        const request = new Request('http://localhost/api/unknown/path', {method: 'GET'});

        const ctx = {request, params: {}} as unknown as APIContext;
        const response = await router.build()(ctx);

        expect(response.status).toBe(404);
        expect(await response.text()).toContain('not here');
    });

    it('should extract param from group base path', async () => {
        const handler = vi.fn((ctx: APIContext) => ok({ section: ctx.params.section }));

        const group = defineGroup('/section/:section').addGet('/info', handler);

        const router = new RouterBuilder({ basePath: '/api' }).addGroup(group);

        const mockRequest = new Request('http://localhost/api/section/settings/info', {
            method: 'GET',
        });

        const ctx = { request: mockRequest, params: {} } as unknown as APIContext;
        const response = await router.build()(ctx);
        const json = await response.json();

        expect(handler).toHaveBeenCalled();
        expect(json).toEqual({ section: 'settings' });
    });

    it('should extract params from both group and route', async () => {
        const handler = vi.fn((ctx: APIContext) =>
            ok({ group: ctx.params.group, id: ctx.params.id })
        );

        const group = defineGroup('/group/:group').addGet('/item/:id', handler);

        const router = new RouterBuilder({ basePath: '/api' }).addGroup(group);

        const mockRequest = new Request('http://localhost/api/group/alpha/item/123', {
            method: 'GET',
        });

        const ctx = { request: mockRequest, params: {} } as unknown as APIContext;
        const response = await router.build()(ctx);
        const json = await response.json();

        expect(handler).toHaveBeenCalled();
        expect(json).toEqual({ group: 'alpha', id: '123' });
    });

});
