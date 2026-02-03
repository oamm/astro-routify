import type { APIContext } from 'astro';
import { HeadersInit } from 'undici';
import { HttpMethod } from '../HttpMethod';
import { defineRoute, type Route } from '../defineRoute';

type JsonValue = any;

/**
 * A writer interface for streaming JSON state to the response body.
 * Supports both NDJSON and array formats.
 */
export interface JsonStreamWriter {
    /**
     * Send a JSON-serializable value to the response stream.
     * - In `ndjson` mode: appends a newline after each object.
     * - In `array` mode: adds commas and wraps with brackets.
     * @param value - Any serializable object or array item
     */
    send: (value: JsonValue) => void;

    /**
     * Write raw text or bytes to the stream.
     * Used for low-level control if needed.
     */
    write: (chunk: string | Uint8Array) => void;

    /**
     * Close the stream. In `array` mode, it writes the closing `]`.
     */
    close: () => void;

    /**
     * Override response headers dynamically before the response is sent.
     * Only safe before the first write.
     * @param key - Header name
     * @param value - Header value
     */
    setHeader: (key: string, value: string) => void;
}

/**
 * Internal configuration options for `createJsonStreamRoute`.
 */
interface JsonStreamOptions {
    /**
     * Streaming mode: 'ndjson' or 'array'.
     */
    mode: 'ndjson' | 'array';

    /**
     * HTTP method to define (e.g. GET, POST).
     */
    method: HttpMethod;
}

/**
 * Creates a streaming JSON route that supports both NDJSON and JSON array formats.
 *
 * - Sets appropriate `Content-Type` headers
 * - Supports cancellation via `AbortSignal`
 * - Provides a `response` object with `send`, `close`, `write`, `setHeader` methods
 *
 * Use this function inside `streamJsonND()` or `streamJsonArray()` to avoid duplication.
 *
 * @param path - The route path (e.g. `/logs`)
 * @param handler - A function that receives Astro `ctx` and a `JsonStreamWriter`
 * @param options - Streaming options (`mode`, `method`)
 * @returns A streaming-compatible Route
 */
export function createJsonStreamRoute(
    path: string,
    handler: (ctx: APIContext & { response: JsonStreamWriter }) => void | Promise<void>,
    options: JsonStreamOptions
): Route {
    const isNDJSON = options.mode === 'ndjson';

    return defineRoute(options.method, path, async (ctx: APIContext) => {
        const encoder = new TextEncoder();
        let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
        let closed = false;
        let first = true;

        const headers: HeadersInit = {
            'Content-Type': isNDJSON ? 'application/x-ndjson; charset=utf-8' : 'application/json; charset=utf-8',
            ...(isNDJSON ? { 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' } : {}),
        };

        const enqueueArray = (chunk: string) => {
            if (!controllerRef) return;
            if (first) {
                controllerRef.enqueue(encoder.encode('[' + chunk));
                first = false;
            } else {
                controllerRef.enqueue(encoder.encode(',' + chunk));
            }
        };

        const writer: JsonStreamWriter = {
            send(value) {
                if (closed || !controllerRef) return;
                const json = JSON.stringify(value);
                if (isNDJSON) {
                    controllerRef.enqueue(encoder.encode(json + '\n'));
                } else {
                    enqueueArray(json);
                }
            },
            write(chunk) {
                if (closed || !controllerRef) return;
                const encoded = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
                controllerRef.enqueue(encoded);
            },
            close() {
                if (closed) return;
                if (!isNDJSON && controllerRef && !first) {
                    controllerRef.enqueue(encoder.encode(']'));
                }
                closed = true;
                controllerRef?.close();
            },
            setHeader(key, value) {
                headers[key] = value;
            },
        };

        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controllerRef = controller;

                const onAbort = () => {
                    closed = true;
                    try {
                        controllerRef?.close();
                    } catch { /* noop */ }
                };

                ctx.request.signal.addEventListener('abort', onAbort, { once: true });

                Promise.resolve(handler({ ...ctx, response: writer }))
                    .catch((err) => {
                        try {
                            controller.error(err);
                        } catch { /* noop */ }
                    })
                    .finally(() => {
                        ctx.request.signal.removeEventListener('abort', onAbort);
                    });
            },
            cancel() {
                closed = true;
            },
        });

        return new Response(body, {
            status: 200,
            headers,
        });
    });
}
