import type {APIContext, APIRoute} from 'astro';
import {internalError, toAstroResponse, type ResultResponse} from './responseHelpers';

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
