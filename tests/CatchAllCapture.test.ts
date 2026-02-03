import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok } from '../src';

describe('Catch-all Capture', () => {
    it('should capture remaining segments in ctx.params["*"]', async () => {
        const builder = new RouterBuilder({ basePath: '' });
        builder.addGet('/static/**', ({ params }) => ok({ rest: params['*'] }));

        const router = builder.build();
        
        const req = new Request('http://localhost/static/path/to/file.txt');
        const res = await (router as any)({ request: req, url: new URL(req.url) });
        const body = await res.json();
        expect(body.rest).toBe('path/to/file.txt');
    });

    it('should capture empty remaining segments', async () => {
        const builder = new RouterBuilder({ basePath: '' });
        builder.addGet('/static/**', ({ params }) => ok({ rest: params['*'] }));

        const router = builder.build();
        
        const req = new Request('http://localhost/static');
        const res = await (router as any)({ request: req, url: new URL(req.url) });
        const body = await res.json();
        expect(body.rest).toBe('');
    });
});
