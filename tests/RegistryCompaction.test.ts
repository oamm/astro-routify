import { beforeEach, describe, expect, it } from 'vitest';
import type { APIContext } from 'astro';
import { defineRoute, globalRegistry, HttpMethod, ok, RouterBuilder } from '../src';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Registry compaction', () => {
    beforeEach(() => {
        globalRegistry.clear();
    });

    it('should keep registry bounded during long HMR-like sessions', async () => {
        for (let i = 0; i < 1400; i++) {
            defineRoute(HttpMethod.GET, `/hmr/${i % 40}`, () => ok(`v${i}`), true);
        }

        expect(globalRegistry.getItems().length).toBeLessThanOrEqual(1000);

        const router = new RouterBuilder().addRegistered().build();
        const res = await router(createContext('http://localhost/api/hmr/39', 'GET'));
        expect(await res.text()).toBe('v1399');
    });
});

