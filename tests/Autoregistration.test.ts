import { describe, it, expect, beforeEach } from 'vitest';
import { RouterBuilder, defineRoute, defineGroup, ok, HttpMethod, globalRegistry } from '../src';

describe('Autoregistration', () => {
    beforeEach(() => {
        globalRegistry.clear();
    });

    it('should auto-register a route', async () => {
        defineRoute(HttpMethod.GET, '/auto-route', () => ok({ message: 'auto' }), true);

        const builder = new RouterBuilder({ basePath: '' });
        builder.addRegistered();
        
        const router = builder.build();
        const request = new Request('http://localhost/auto-route');
        const response = await (router as any)( { request, url: new URL(request.url) } );
        
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.message).toBe('auto');
    });

    it('should auto-register a group', async () => {
        defineGroup('/auto-group', (group) => {
            group.addGet('/test', () => ok({ message: 'group-auto' }));
        }, true);

        const builder = new RouterBuilder({ basePath: '' });
        builder.addRegistered();
        
        const router = builder.build();
        const request = new Request('http://localhost/auto-group/test');
        const response = await (router as any)( { request, url: new URL(request.url) } );
        
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.message).toBe('group-auto');
    });

    it('createRouter should automatically include registered items', async () => {
        defineRoute(HttpMethod.GET, '/create-router-auto', () => ok({ message: 'cr-auto' }), true);
        
        const { createRouter } = await import('../src');
        const router = createRouter({ basePath: '' });
        
        const request = new Request('http://localhost/create-router-auto');
        const response = await (router as any)( { request, url: new URL(request.url) } );
        
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.message).toBe('cr-auto');
    });
});
