import type { APIContext, APIRoute } from 'astro';
import { internalError, toAstroResponse, isReadableStream, type ResultResponse } from './responseHelpers';
import { BodyInit } from 'undici';

/**
 * Enhanced Astro context for Routify.
 */
export interface RoutifyContext extends APIContext {
    /**
     * Parsed query parameters from the URL.
     */
    query: Record<string, string>;

    /**
     * Shared data container for middlewares and handlers (e.g., validation results).
     */
    data: Record<string, any>;
}

/**
 * A middleware function that can modify the context or short-circuit the response.
 */
export type Middleware = (
    ctx: RoutifyContext,
    next: () => Promise<Response>
) => Promise<Response> | Response;

/**
 * A flexible route handler that can return:
 * - a native `Response` object,
 * - a structured `ResultResponse` object,
 * - or a file stream (Blob, ArrayBuffer, or ReadableStream).
 */
export type Handler = (
    ctx: RoutifyContext
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

            const result = await handler(ctx as RoutifyContext);

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

