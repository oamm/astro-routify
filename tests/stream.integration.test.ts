import {defineRouter, stream} from '../src';
import type {APIContext} from 'astro';
import {describe, it, expect} from 'vitest';

describe('stream() helper - integration', () => {
    it('streams chunks and closes (SSE by default)', async () => {

        const route = stream('/sse', ({response}) => {
            response.write('hello');
            response.write('world');
            response.close();
        });

        const router = defineRouter([route], {basePath: '/api'});

        const request = new Request('http://localhost/api/sse', {method: 'GET'});
        const ctx = {request, params: {}} as unknown as APIContext;

        const res = await router(ctx);

        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('text/event-stream');

        const reader = res.body!.getReader();
        const chunks: Uint8Array[] = [];
        for (; ;) {
            const {value, done} = await reader.read();
            if (done) break;
            chunks.push(value!);
        }

        const text = new TextDecoder().decode(
            chunks.length === 1 ? chunks[0] : concatUint8(chunks)
        );

        expect(text).toBe('state: hello\n\nstate: world\n\n');
    });
});

function concatUint8(parts: Uint8Array[]) {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
        out.set(p, offset);
        offset += p.length;
    }
    return out;
}
