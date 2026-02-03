import {describe, it, expect} from 'vitest';
import {RouteTrie, HttpMethod, type Handler} from '../src';

const dummy = (label: string): Handler => () => ({status: 200, body: label});

describe('RouteTrie', () => {
    it('matches static route', () => {
        const trie = new RouteTrie();
        trie.insert({ path: '/users', method: HttpMethod.GET, handler: dummy('users') });

        const result = trie.find('/users', HttpMethod.GET);
        expect(result.route).toBeDefined();
        expect(result.params).toEqual({});
    });

    it('matches dynamic param route', () => {
        const trie = new RouteTrie();
        trie.insert({ path: '/users/:id', method: HttpMethod.GET, handler: dummy('user-id') });

        const result = trie.find('/users/123', HttpMethod.GET);
        expect(result.route).toBeDefined();
        expect(result.params).toEqual({id: '123'});
    });

    it('resolves static over dynamic when overlapping', () => {
        const trie = new RouteTrie();
        trie.insert({ path: '/users/me', method: HttpMethod.GET, handler: dummy('me') });
        trie.insert({ path: '/users/:id', method: HttpMethod.GET, handler: dummy('user-id') });

        const result = trie.find('/users/me', HttpMethod.GET);
        expect(result.route).toBeDefined();
        expect(result.params).toEqual({});
    });

    it('returns 405 allowed methods when method does not match', () => {
        const trie = new RouteTrie();
        trie.insert({ path: '/posts', method: HttpMethod.GET, handler: dummy('posts') });

        const result = trie.find('/posts', HttpMethod.POST);
        expect(result.route).toBeNull();
        expect(result.allowed).toEqual([HttpMethod.GET]);
    });

    it('returns 404 when no matching path', () => {
        const trie = new RouteTrie();
        trie.insert({ path: '/existing', method: HttpMethod.GET, handler: dummy('existing') });

        const result = trie.find('/not-found', HttpMethod.GET);
        expect(result.route).toBeNull();
        expect(result.allowed).toBeUndefined();
    });

    it('supports multiple methods per path', () => {
        const trie = new RouteTrie();
        trie.insert({ path: '/action', method: HttpMethod.GET, handler: dummy('get-action') });
        trie.insert({ path: '/action', method: HttpMethod.POST, handler: dummy('post-action') });

        expect(trie.find('/action', HttpMethod.GET).route).toBeDefined();
        expect(trie.find('/action', HttpMethod.POST).route).toBeDefined();
        expect(trie.find('/action', HttpMethod.PUT).route).toBeNull();
    });
});
