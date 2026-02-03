import {defineRouter, streamJsonND, streamJsonArray} from '../dist';
import type {APIContext} from 'astro';
import {describe, it, expect} from 'vitest';

describe('streamJson split helpers - integration', () => {
    it('streams NDJSON values', async () => {
        const route = streamJsonND('/ndjson',
            async ({response}) => {
            response.send({a: 1});
            response.send({b: 2});
            response.close();
        });

        const router = defineRouter([route], {basePath: '/api'});
        const req = new Request('http://localhost/api/ndjson', {method: 'GET'});
        const ctx = {request: req, params: {}} as unknown as APIContext;

        const res = await router(ctx);
        expect(res.headers.get('Content-Type')).toContain('application/x-ndjson');

        const reader = res.body!.getReader();
        const chunks: Uint8Array[] = [];
        for (; ;) {
            const {value, done} = await reader.read();
            if (done) break;
            chunks.push(value!);
        }
        const text = new TextDecoder().decode(concat(chunks));
        expect(text).toBe('{"a":1}\n{"b":2}\n');
    });

    it('streams a valid JSON array', async () => {
        const route = streamJsonArray('/array',
            async ({response}) => {
            response.send({x: 1});
            response.send({x: 2});
            response.close();
        });

        const router = defineRouter([route], {basePath: '/api'});
        const req = new Request('http://localhost/api/array', {method: 'GET'});
        const ctx = {request: req, params: {}} as unknown as APIContext;

        const res = await router(ctx);
        expect(res.headers.get('Content-Type')).toContain('application/json');

        const reader = res.body!.getReader();
        const chunks: Uint8Array[] = [];
        for (; ;) {
            const {value, done} = await reader.read();
            if (done) break;
            chunks.push(value!);
        }
        const text = new TextDecoder().decode(concat(chunks));
        expect(text).toBe('[{"x":1},{"x":2}]');
    });

    it('handles AbortSignal during NDJSON stream', async () => {
        const route = streamJsonND('/abort',
            async ({response, request}) => {
            let count = 0;
            const interval = setInterval(() => {
                response.send({tick: count++});
            }, 100);

            request.signal.addEventListener('abort', () => {
                clearInterval(interval);
                response.close();
            });
        });

        const router = defineRouter([route], {basePath: '/api'});

        const controller = new AbortController();
        const req = new Request('http://localhost/api/abort', {
            method: 'GET',
            signal: controller.signal,
        });
        const ctx = {request: req, params: {}} as unknown as APIContext;

        const res = await router(ctx);
        const reader = res.body!.getReader();

        const {value} = await reader.read();
        controller.abort();

        expect(value).toBeDefined();
    });

    it('handles invalid JSON (circular) gracefully', async () => {
        const route = streamJsonND('/error', async ({response}) => {
            const a: any = {};
            a.self = a;
            expect(() => response.send(a)).toThrow();
            response.close();
        });

        const router = defineRouter([route], {basePath: '/api'});
        const req = new Request('http://localhost/api/error', {method: 'GET'});
        const ctx = {request: req, params: {}} as unknown as APIContext;

        const res = await router(ctx);
        expect(res.status).toBe(200);
    });

    it('uses route param (e.g. /user/:id)', async () => {
        const route = streamJsonND('/user/:id', async ({response, params}) => {
            response.send({userId: params.id});
            response.close();
        });

        const router = defineRouter([route], {basePath: '/api'});
        const req = new Request('http://localhost/api/user/42', {method: 'GET'});
        const ctx = {request: req, params: {}} as unknown as APIContext;

        const res = await router(ctx);
        const reader = res.body!.getReader();
        const {value} = await reader.read();
        const text = new TextDecoder().decode(value!);
        expect(text).toBe('{"userId":"42"}\n');
    });

    it('supports nested routes (e.g. /nested/deep/stream)', async () => {
        const route = streamJsonND('/nested/deep/stream', async ({response}) => {
            response.send({message: 'deep'});
            response.send({message: 'stream'});
            response.close();
        });

        const router = defineRouter([route], {basePath: '/api'});
        const req = new Request('http://localhost/api/nested/deep/stream', {method: 'GET'});
        const ctx = {request: req, params: {}} as unknown as APIContext;

        const res = await router(ctx);
        const reader = res.body!.getReader();

        const chunks: Uint8Array[] = [];
        for (; ;) {
            const {value, done} = await reader.read();
            if (done) break;
            chunks.push(value!);
        }
        const text = new TextDecoder().decode(concat(chunks));
        expect(text).toBe('{"message":"deep"}\n{"message":"stream"}\n');
    });
});


function concat(parts: Uint8Array[]) {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
        out.set(p, off);
        off += p.length;
    }
    return out;
}
