import {defineGroup, HttpMethod, ok} from '../src';
import {describe, it, expect} from 'vitest';

describe('defineGroup()', () => {
    it('should return a group with the correct base path', () => {
        const group = defineGroup('/users');
        expect(group.getBasePath()).toBe('/users');
    });

    it('should normalize base path by removing trailing slash', () => {
        const group = defineGroup('/admin/');
        expect(group.getBasePath()).toBe('/admin');
    });

    it('should add a GET route with composed path', () => {
        const group = defineGroup('/users').addGet('/profile', () => ok('ok'));

        const routes = group.getRoutes();
        expect(routes).toHaveLength(1);
        expect(routes[0].method).toBe(HttpMethod.GET);
        expect(routes[0].path).toBe('/users/profile');
    });

    it('should handle missing slash in subpath', () => {
        const group = defineGroup('/users').addGet('profile', () => ok('ok'));

        const route = group.getRoutes()[0];
        expect(route.path).toBe('/users/profile');
    });

    it('should support all HTTP methods', () => {
        const group = defineGroup('/test')
            .addGet('/get', () => ok('GET'))
            .addPost('/post', () => ok('POST'))
            .addPut('/put', () => ok('PUT'))
            .addDelete('/delete', () => ok('DELETE'))
            .addPatch('/patch', () => ok('PATCH'));

        const methods = group.getRoutes().map(r => r.method);
        expect(methods).toContain(HttpMethod.GET);
        expect(methods).toContain(HttpMethod.POST);
        expect(methods).toContain(HttpMethod.PUT);
        expect(methods).toContain(HttpMethod.DELETE);
        expect(methods).toContain(HttpMethod.PATCH);
        expect(group.getRoutes()).toHaveLength(5);
    });

    it('should support configuration callback', () => {
        const group = defineGroup('/configured', (g) => {
            g.addGet('/hello', () => ok('Hello'));
        });

        const route = group.getRoutes()[0];
        expect(route.path).toBe('/configured/hello');
        expect(route.method).toBe(HttpMethod.GET);
    });
});
