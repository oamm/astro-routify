import type { APIContext, APIRoute } from 'astro';
import { internalError, toAstroResponse, type ResultResponse } from './responseHelpers';
import { BodyInit } from 'undici';

/**
 * A flexible route handler that can return:
 * - a native `Response` object,
 * - a structured `ResultResponse` object,
 * - or a file stream (Blob, ArrayBuffer, or ReadableStream).
 */
export type Handler = (
    ctx: APIContext
) => Promise<ResultResponse | Response> | ResultResponse | Response;

/**
 * Logs the incoming request method and path to the console.
 */
function logRequest(ctx: APIContext) {
    const { method, url } = ctx.request;
    console.info(`[astro-routify] → ${method} ${new URL(url).pathname}`);
}

/**
 * Logs the response status and time taken.
 */
function logResponse(status: number, start: number) {
    console.info(
        `[astro-routify] ← responded ${status} in ${Math.round(performance.now() - start)}ms`
    );
}

/**
 * Wraps a `Handler` function into an `APIRoute` that:
 * - logs requests and responses,
 * - supports all valid `ResultResponse` return formats,
 * - auto-converts structured responses into Astro `Response`s,
 * - handles errors with standardized 500 output.
 *
 * @param handler - A handler function returning a `Response` or `ResultResponse`
 * @returns An Astro-compatible `APIRoute` function
 */
export function defineHandler(handler: Handler): APIRoute {
    return async (ctx: APIContext): Promise<Response> => {
        const start = performance.now();
        try {
            logRequest(ctx);

            const result = await handler(ctx);

            // Native Response shortcut
            if (result instanceof Response) {
                logResponse(result.status, start);
                return result;
            }

            // Direct binary or stream body (file download, etc.)
            if (
                result?.body instanceof Blob ||
                result?.body instanceof ArrayBuffer ||
                isReadableStream(result?.body)
            ) {
                const res = new Response(result.body as BodyInit, {
                    status: result.status,
                    headers: result.headers,
                });
                logResponse(res.status, start);
                return res;
            }

            // Structured ResultResponse → native Astro Response
            const finalResponse = toAstroResponse(result);
            logResponse(finalResponse.status, start);
            return finalResponse;
        } catch (err) {
            console.error('[astro-routify] handler error', err);
            const res = toAstroResponse(internalError(err));
            logResponse(res.status, start);
            return res;
        }
    };
}

/**
 * Type guard to detect ReadableStreams, used for streamed/binary responses.
 *
 * @param value - Any value to test
 * @returns True if it looks like a ReadableStream
 */
export function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as any).getReader === 'function'
    );
}
