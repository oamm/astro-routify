import {describe, bench} from 'vitest';
import {RouteTrie, HttpMethod, defineHandler} from '../dist';

// Prepare a mock handler
const mockHandler = defineHandler(() => new Response('ok'));

// Helper to create thousands of routes
function buildTrieWithRoutes(count: number): RouteTrie {
    const trie = new RouteTrie();
    for (let i = 0; i < count; i++) {
        trie.insert(`/route/${i}`, HttpMethod.GET, mockHandler);
    }
    return trie;
}

describe('RouteTrie performance', () => {
    const SMALL = 100;
    const MEDIUM = 1_000;
    const LARGE = 10_000;

    const trieSmall = buildTrieWithRoutes(SMALL);
    const trieMedium = buildTrieWithRoutes(MEDIUM);
    const trieLarge = buildTrieWithRoutes(LARGE);

    bench(`Lookup in SMALL (${SMALL} routes)`, () => {
        trieSmall.find('/route/42', HttpMethod.GET);
    });

    bench(`Lookup in MEDIUM (${MEDIUM} routes)`, () => {
        trieMedium.find('/route/420', HttpMethod.GET);
    });

    bench(`Lookup in LARGE (${LARGE} routes)`, () => {
        trieLarge.find('/route/9000', HttpMethod.GET);
    });

    bench(`Lookup non-existent route in LARGE`, () => {
        trieLarge.find('/does/not/exist', HttpMethod.GET);
    });
});
