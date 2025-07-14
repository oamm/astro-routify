import {describe, it, expect} from 'vitest';
import {RouteTrie, HttpMethod, type Handler} from '../dist';

const dummy = (label: string): Handler => () => ({status: 200, body: label});

describe('RouteTrie', () => {
    it('matches static route', () => {
        const trie = new RouteTrie();
        trie.insert('/users', HttpMethod.GET, dummy('users'));

        const result = trie.find('/users', HttpMethod.GET);
        expect(result.handler).toBeDefined();
        expect(result.params).toEqual({});
    });

    it('matches dynamic param route', () => {
        const trie = new RouteTrie();
        trie.insert('/users/:id', HttpMethod.GET, dummy('user-id'));

        const result = trie.find('/users/123', HttpMethod.GET);
        expect(result.handler).toBeDefined();
        expect(result.params).toEqual({id: '123'});
    });

    it('resolves static over dynamic when overlapping', () => {
        const trie = new RouteTrie();
        trie.insert('/users/me', HttpMethod.GET, dummy('me'));
        trie.insert('/users/:id', HttpMethod.GET, dummy('user-id'));

        const result = trie.find('/users/me', HttpMethod.GET);
        expect(result.handler).toBeDefined();
        expect(result.params).toEqual({});
    });

    it('returns 405 allowed methods when method does not match', () => {
        const trie = new RouteTrie();
        trie.insert('/posts', HttpMethod.GET, dummy('posts'));

        const result = trie.find('/posts', HttpMethod.POST);
        expect(result.handler).toBeNull();
        expect(result.allowed).toEqual([HttpMethod.GET]);
    });

    it('returns 404 when no matching path', () => {
        const trie = new RouteTrie();
        trie.insert('/existing', HttpMethod.GET, dummy('existing'));

        const result = trie.find('/not-found', HttpMethod.GET);
        expect(result.handler).toBeNull();
        expect(result.allowed).toBeUndefined();
    });

    it('supports multiple methods per path', () => {
        const trie = new RouteTrie();
        trie.insert('/action', HttpMethod.GET, dummy('get-action'));
        trie.insert('/action', HttpMethod.POST, dummy('post-action'));

        expect(trie.find('/action', HttpMethod.GET).handler).toBeDefined();
        expect(trie.find('/action', HttpMethod.POST).handler).toBeDefined();
        expect(trie.find('/action', HttpMethod.PUT).handler).toBeNull();
    });
});
