import type { APIContext, APIRoute } from 'astro';
import { internalError, toAstroResponse, type HandlerResult } from './responseHelpers';

/**
 * Enhanced Astro context for Routify.
 */
export interface RoutifyContext<State = Record<string, any>> extends APIContext {
    /**
     * Parsed query parameters from the URL.
     * Note: If multiple parameters have the same key, only the last one is included.
     * Use `searchParams` for full multi-value support.
     */
    query: Record<string, string | string[]>;

    /**
     * Full URLSearchParams object for the incoming request.
     */
    searchParams: URLSearchParams;

    /**
     * Shared state container for middlewares and handlers (e.g., validation results).
     * This is where middlewares can store information for subsequent handlers.
     */
    state: State;
}

/**
 * Convenience type alias for RoutifyContext.
 */
export type Context<State = Record<string, any>> = RoutifyContext<State>;

/**
 * A middleware function that can modify the context or short-circuit the response.
 */
export type Middleware<State = any> = (
    ctx: RoutifyContext<State>,
    next: () => Promise<Response>
) => Promise<Response> | Response;

/**
 * A flexible route handler that can return various types.
 */
export type Handler<State = any> = (
    ctx: RoutifyContext<State>
) => Promise<HandlerResult> | HandlerResult;

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

            // Structured ResultResponse or other HandlerResult → native Astro Response
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

