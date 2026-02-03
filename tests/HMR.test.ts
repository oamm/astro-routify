import { describe, it, expect, beforeEach } from 'vitest';
import {RouterBuilder, defineRoute, ok, globalRegistry, HttpMethod} from '../src';
import type { APIContext } from 'astro';

const createContext = (url: string, method: string): APIContext =>
    ({
        request: new Request(url, { method }),
        params: {},
    } as unknown as APIContext);

describe('HMR Simulation', () => {
    beforeEach(() => {
        globalRegistry.clear();
    });

    it('should overwrite old handler with new one in global registry (Auto-registration HMR)', async () => {
        // 1. Initial registration (simulating first file load)
        defineRoute(HttpMethod.GET, '/test', () => ok('v1'), true);
        
        const routerV1 = new RouterBuilder().addRegistered().build();
        const resV1 = await routerV1(createContext('http://localhost/api/test', HttpMethod.GET));
        expect(await resV1.text()).toBe('v1');

        // 2. Re-registration (simulating file save/reload)
        // In real HMR, the file re-executes, adding the same route again to the registry.
        defineRoute(HttpMethod.GET, '/test', () => ok('v2'), true);

        const routerV2 = new RouterBuilder().addRegistered().build();
        const resV2 = await routerV2(createContext('http://localhost/api/test', HttpMethod.GET));
        expect(await resV2.text()).toBe('v2');
        
        // Ensure both items are in registry but only the last one is effective
        expect(globalRegistry.getItems().length).toBe(2);
    });

    it('should support HMR via addModules (import.meta.glob simulation)', async () => {
        const path = './test.routes.ts';
        
        // 1. First "import"
        const modulesV1 = {
            [path]: {
                default: defineRoute(HttpMethod.GET, '/module', () => ok('mod-v1'))
            }
        };
        
        const routerV1 = new RouterBuilder().addModules(modulesV1).build();
        const resV1 = await routerV1(createContext('http://localhost/api/module', HttpMethod.GET));
        expect(await resV1.text()).toBe('mod-v1');

        // 2. Second "import" (Vite re-imports the module on change)
        const modulesV2 = {
            [path]: {
                default: defineRoute(HttpMethod.GET, '/module', () => ok('mod-v2'))
            }
        };

        const routerV2 = new RouterBuilder().addModules(modulesV2).build();
        const resV2 = await routerV2(createContext('http://localhost/api/module', HttpMethod.GET));
        expect(await resV2.text()).toBe('mod-v2');
    });

    it('should maintain other routes during HMR', async () => {
        defineRoute(HttpMethod.GET, '/keep', () => ok('keep'), true);
        defineRoute(HttpMethod.GET, '/change', () => ok('v1'), true);

        const routerV1 = new RouterBuilder().addRegistered().build();
        expect(await (await routerV1(createContext('http://localhost/api/keep', HttpMethod.GET))).text()).toBe('keep');
        expect(await (await routerV1(createContext('http://localhost/api/change', HttpMethod.GET))).text()).toBe('v1');

        // Change one route
        defineRoute(HttpMethod.GET, '/change', () => ok('v2'), true);

        const routerV2 = new RouterBuilder().addRegistered().build();
        
        const resKeep = await routerV2(createContext('http://localhost/api/keep', HttpMethod.GET));
        expect(await resKeep.text()).toBe('keep');

        const resChange = await routerV2(createContext('http://localhost/api/change', HttpMethod.GET));
        expect(await resChange.text()).toBe('v2');
    });

    it('should handle complex mixed registration HMR', async () => {
        // Initial state
        defineRoute(HttpMethod.GET, '/a', () => ok('a1'), true);
        const modules = {
            'b.ts': { GET: defineRoute(HttpMethod.GET, '/b', () => ok('b1')) }
        };

        const router1 = new RouterBuilder().addRegistered().addModules(modules).build();
        expect(await (await router1(createContext('http://localhost/api/a', HttpMethod.GET)))
            .text()).toBe('a1');
        expect(await (await router1(createContext('http://localhost/api/b', HttpMethod.GET)))
            .text()).toBe('b1');

        // Update both
        defineRoute(HttpMethod.GET, '/a', () => ok('a2'), true);
        const modulesUpdated = {
            'b.ts': { GET: defineRoute(HttpMethod.GET, '/b', () => ok('b2')) }
        };

        const router2 = new RouterBuilder().addRegistered().addModules(modulesUpdated).build();
        expect(await (await router2(createContext('http://localhost/api/a', HttpMethod.GET)))
            .text()).toBe('a2');
        expect(await (await router2(createContext('http://localhost/api/b', HttpMethod.GET)))
            .text()).toBe('b2');
    });
});
