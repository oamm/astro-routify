import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { defineGroup, defineRoute, globalRegistry, HttpMethod, ok, RouterBuilder } from '../src';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('Dev session endurance', () => {
    beforeEach(() => {
        globalRegistry.clear();
    });

    it('keeps behavior stable under long HMR-like churn with mixed registration modes', async () => {
        const lazyLoader = vi.fn(async () => ({
            default: defineRoute(HttpMethod.GET, '/lazy/stable', () => ok('lazy-stable')),
        }));

        for (let i = 0; i < 1500; i++) {
            defineRoute(HttpMethod.GET, `/r/${i % 60}`, () => ok(`r-${i}`), true);

            if (i % 5 === 0) {
                defineGroup('/g', (g) => {
                    g.addGet(`/x${i % 20}`, () => ok(`gx-${i}`));
                }, true);
            }
        }

        expect(globalRegistry.getItems().length).toBeLessThanOrEqual(1000);

        const router = new RouterBuilder({ basePath: '/api' })
            .addModules({ './lazy.route.ts': lazyLoader })
            .addRegistered()
            .build();

        const [a, b] = await Promise.all([
            router(createContext('http://localhost/api/lazy/stable', 'GET')),
            router(createContext('http://localhost/api/lazy/stable', 'GET')),
        ]);

        expect(await a.text()).toBe('lazy-stable');
        expect(await b.text()).toBe('lazy-stable');
        expect(lazyLoader).toHaveBeenCalledTimes(1);

        const latestRoute = await router(createContext('http://localhost/api/r/59', 'GET'));
        expect(await latestRoute.text()).toBe('r-1499');
    });
});

