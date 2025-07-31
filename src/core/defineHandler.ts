import type {APIContext, APIRoute} from 'astro';
import {internalError, toAstroResponse, type ResultResponse} from './responseHelpers';
import {BodyInit} from "undici";

export type Handler = (
    ctx: APIContext
) => Promise<ResultResponse | Response> | ResultResponse | Response;

function logRequest(ctx: APIContext) {
    const {method, url} = ctx.request;
    console.info(`[astro-routify] → ${method} ${new URL(url).pathname}`);
}

function logResponse(status: number, start: number) {
    console.info(
        `[astro-routify] ← responded ${status} in ${Math.round(performance.now() - start)}ms`
    );
}

export function defineHandler(handler: Handler): APIRoute {
    return async (ctx: APIContext): Promise<Response> => {
        const start = performance.now();
        try {
            logRequest(ctx);

            const result = await handler(ctx);

            if (result instanceof Response) {
                logResponse(result.status, start);
                return result;
            }

            // If it's a file response (manual BodyInit with appropriate headers)
            if (result?.body instanceof Blob ||
                result?.body instanceof ArrayBuffer ||
                isReadableStream(result?.body)) {
                const res = new Response(result.body as BodyInit, {
                    status: result.status,
                    headers: result.headers,
                });
                logResponse(res.status, start);
                return res;
            }

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

export function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as any).getReader === 'function'
    );
}
