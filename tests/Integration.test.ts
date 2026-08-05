import {describe, expect, it, vi} from 'vitest';
import {routify} from '../src';

describe('routify integration', () => {
    it('registers eager glob exports for createRouter()', () => {
        const updateConfig = vi.fn();
        const integration = routify();
        const setup = integration.hooks['astro:config:setup'];

        if (typeof setup !== 'function') throw new Error('missing config setup hook');
        setup({updateConfig} as any);

        const vitePlugin = updateConfig.mock.calls[0][0].vite.plugins[0];
        const source = vitePlugin.load('\0virtual:astro-routify/auto-register');

        expect(source).toContain("import { globalRegistry } from 'astro-routify'");
        expect(source).toContain('globalRegistry.register(value)');
    });
});
