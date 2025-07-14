import {describe, bench} from 'vitest';
import {defineHandler, HttpMethod, RouteTrie} from "../dist";


// Mock handler
const mockHandler = defineHandler(() => new Response('ok'));

// Static route builder
function buildStaticTrie(count: number): RouteTrie {
    const trie = new RouteTrie();
    for (let i = 0; i < count; i++) {
        trie.insert(`/static/page-${i}`, HttpMethod.GET, mockHandler);
    }
    return trie;
}

// Realistic nested API routes
function buildRealisticTrie(): RouteTrie {
    const trie = new RouteTrie();
    trie.insert('/users/:userId', HttpMethod.GET, mockHandler);
    trie.insert('/users/:userId/settings', HttpMethod.GET, mockHandler);
    trie.insert('/users/:userId/orders/:orderId', HttpMethod.GET, mockHandler);
    trie.insert('/blog/:year/:month/:slug', HttpMethod.GET, mockHandler);
    trie.insert('/admin/dashboard', HttpMethod.GET, mockHandler);
    trie.insert('/admin/users/:userId/audit', HttpMethod.GET, mockHandler);
    return trie;
}

describe('RouteTrie performance - realistic route shapes', () => {
    const STATIC_COUNT = 5_000;
    const staticTrie = buildStaticTrie(STATIC_COUNT);
    const realisticTrie = buildRealisticTrie();

    bench(`Static route lookup (${STATIC_COUNT})`, () => {
        staticTrie.find('/static/page-4999', HttpMethod.GET);
    });

    bench(`Param route: /users/:userId`, () => {
        const match = realisticTrie.find('/users/abc123', HttpMethod.GET);
        if (match?.params.userId !== 'abc123') {
            throw new Error('Unexpected route match result');
        }
    });

    bench(`Nested param route: /users/:userId/orders/:orderId`, () => {
        const match = realisticTrie.find('/users/abc123/orders/xyz789', HttpMethod.GET);
        if (match?.params.userId !== 'abc123' || match?.params.orderId !== 'xyz789') {
            throw new Error('Unexpected route match result');
        }
    });

    bench(`Blog route: /blog/:year/:month/:slug`, () => {
        const match = realisticTrie.find('/blog/2025/07/astro-routify-release', HttpMethod.GET);
        if (
            match?.params.slug !== 'astro-routify-release' ||
            match?.params.year !== '2025' ||
            match?.params.month !== '07'
        ) {
            throw new Error('Unexpected route match result');
        }
    });

    bench(`Nonexistent path`, () => {
        realisticTrie.find('/404/this/path/does/not/exist', HttpMethod.GET);
    });
});
