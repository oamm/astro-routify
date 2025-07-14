import type {APIContext, APIRoute} from 'astro';
import {defineHandler} from './defineHandler';
import {methodNotAllowed, notFound, toAstroResponse} from './responseHelpers';
import {RouteTrie} from './RouteTrie';
import type {Route} from './defineRoute';
import {normalizeMethod} from './HttpMethod';

export interface RouterOptions {
    /** Custom 404 handler */
    onNotFound?: () => ReturnType<typeof notFound>;
}

export function defineRouter(routes: Route[], options: RouterOptions = {}): APIRoute {
    const trie = new RouteTrie();

    for (const route of routes) {
        trie.insert(route.path, route.method, route.handler);
    }

    // Wrap every user handler through defineHandler for uniform logging & error handling
    return async (ctx: APIContext): Promise<Response> => {
        const path = new URL(ctx.request.url).pathname.replace(/^\/api/, '');
        const method = normalizeMethod(ctx.request.method);

        const {handler, allowed, params} = trie.find(path, method);

        if (!handler) {
            // No handler for this method – but maybe other methods exist → 405
            if (allowed && allowed.length) {
                return toAstroResponse(
                    methodNotAllowed('Method Not Allowed', {
                        Allow: allowed.join(', '),
                    })
                );
            }
            const notFoundHandler = options.onNotFound ? options.onNotFound() : notFound('Not Found');
            return toAstroResponse(notFoundHandler);
        }
        return defineHandler(handler)({...ctx, params: {...ctx.params, ...params}});
    };
}
