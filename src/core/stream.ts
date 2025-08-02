import type { APIContext } from 'astro';
import { defineRoute, type Route } from './defineRoute';
import { HttpMethod } from './HttpMethod';
import { HeadersInit } from 'undici';

/**
 * A writer for streaming raw data to the response body.
 *
 * This is used inside the `stream()` route handler to emit bytes
 * or strings directly to the client with backpressure awareness.
 */
export interface StreamWriter {
    /**
     * Write a string or Uint8Array chunk to the response stream.
     * @param chunk - Text or byte chunk to emit
     */
    write: (chunk: string | Uint8Array) => void;

    /**
     * Close the stream and signal end-of-response to the client.
     */
    close: () => void;

    /**
     * Dynamically change the Content-Type header.
     * Should be called before the first `write()` to take effect.
     * @param type - MIME type (e.g., `text/html`, `application/json`)
     */
    setContentType: (type: string) => void;
}

/**
 * Configuration options for the `stream()` route helper.
 */
export interface StreamOptions {
    /**
     * HTTP method (defaults to GET).
     */
    method?: HttpMethod;

    /**
     * Content-Type header (defaults to `text/event-stream`).
     */
    contentType?: string;

    /**
     * Additional custom headers.
     */
    headers?: HeadersInit;

    /**
     * Enable SSE keep-alive headers (defaults to true for SSE).
     */
    keepAlive?: boolean;
}

/**
 * Defines a generic streaming route that can write raw chunks of data
 * to the response in real time using a `ReadableStream`.
 *
 * Suitable for Server-Sent Events (SSE), long-polling, streamed HTML,
 * logs, LLM output, or NDJSON responses.
 *
 * @example
 * stream('/clock', async ({ response }) => {
 *   const timer = setInterval(() => {
 *     response.write(`data: ${new Date().toISOString()}\n\n`);
 *   }, 1000);
 *
 *   setTimeout(() => {
 *     clearInterval(timer);
 *     response.close();
 *   }, 5000);
 * });
 *
 * @param path - The route path (e.g. `/clock`)
 * @param handler - Handler that receives the API context and response writer
 * @param options - Optional stream configuration
 * @returns A Route object ready to be used in `defineRouter()`
 */
export function stream(
    path: string,
    handler: (ctx: APIContext & { response: StreamWriter }) => void | Promise<void>,
    options?: StreamOptions
): Route {
    const method = options?.method ?? HttpMethod.GET;

    return defineRoute(method, path, async (ctx) => {
        let contentType = options?.contentType ?? 'text/event-stream';
        const encoder = new TextEncoder();

        let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
        let closed = false;

        const writer: StreamWriter = {
            write: (chunk) => {
                if (closed || !controllerRef) return;
                const bytes = typeof chunk === 'string' ?
                    encoder.encode(`data: ${chunk}\n\n`)
                    : chunk;
                controllerRef.enqueue(bytes);
            },
            close: () => {
                if (closed) return;
                closed = true;
                try {
                    controllerRef?.close();
                } catch { /* noop */ }
            },
            setContentType: (type: string) => {
                contentType = type;
            },
        };

        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controllerRef = controller;

                Promise.resolve(handler({ ...ctx, response: writer }))
                    .catch((err) => {
                        try {
                            controller.error(err);
                        } catch { /* noop */ }
                    });

                ctx.request.signal.addEventListener('abort', () => {
                    closed = true;
                    controller.close();
                    console.debug('Request aborted — streaming stopped.');
                });
            },
            cancel() {
                closed = true;
                console.debug('Stream cancelled explicitly.');
            },
        });

        const defaultSseHeaders: HeadersInit =
            contentType === 'text/event-stream' && options?.keepAlive !== false
                ? {
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                }
                : {};

        return new Response(body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                ...defaultSseHeaders,
                ...(options?.headers ?? {}),
            },
        });
    });
}
