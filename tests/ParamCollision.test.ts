import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok } from '../src';

describe('Param Collision', () => {
    it('should correctly bind param names when routes share dynamic segments', async () => {
        const builder = new RouterBuilder({ basePath: '' });
        builder.addGet('/users/:id', ({ params }) => ok({ id: params.id }));
        builder.addGet('/users/:slug/profile', ({ params }) => ok({ slug: params.slug }));

        const router = builder.build();
        
        const req1 = new Request('http://localhost/users/123');
        const res1 = await (router as any)({ request: req1, url: new URL(req1.url) });
        const body1 = await res1.json();
        expect(body1.id).toBe('123');

        const req2 = new Request('http://localhost/users/alex/profile');
        const res2 = await (router as any)({ request: req2, url: new URL(req2.url) });
        const body2 = await res2.json();
        expect(body2.slug).toBe('alex');
    });
});
