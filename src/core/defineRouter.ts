import type { APIContext, APIRoute } from 'astro';
import { defineHandler } from './defineHandler';
import { methodNotAllowed, notFound, toAstroResponse } from './responseHelpers';
import { RouteTrie } from './RouteTrie';
import type { Route } from './defineRoute';
import { normalizeMethod } from './HttpMethod';

/**
 * Optional configuration for the router instance.
 */
export interface RouterOptions {
    /**
     * A base path to strip from the incoming request path (default: `/api`).
     * Only routes beneath this prefix will be matched.
     */
    basePath?: string;

    /**
     * Custom handler to return when no route is matched (404).
     */
    onNotFound?: () => ReturnType<typeof notFound>;
}

/**
 * Defines a router that dynamically matches registered routes based on method and path.
 *
 * This allows building a clean, centralized API routing system with features like:
 * - Trie-based fast route lookup
 * - Per-method matching with 405 fallback
 * - Parameter extraction (e.g. `/users/:id`)
 * - Customizable basePath and 404 behavior
 *
 * @example
 * defineRouter([
 *   defineRoute('GET', '/users', handler),
 *   defineRoute('POST', '/login', loginHandler),
 * ], {
 *   basePath: '/api',
 *   onNotFound: () => notFound('No such route')
 * });
 *
 * @param routes - An array of route definitions (see `defineRoute`)
 * @param options - Optional router config (basePath, custom 404)
 * @returns An Astro-compatible APIRoute handler
 */
export function defineRouter(routes: Route[], options: RouterOptions = {}): APIRoute {
    const trie = new RouteTrie();

    for (const route of routes) {
        trie.insert(route.path, route.method, route.handler);
    }

    return async (ctx: APIContext): Promise<Response> => {
        const pathname = new URL(ctx.request.url).pathname;

        let basePath = options.basePath ?? '/api';
        if (!basePath.startsWith('/')) {
            basePath = '/' + basePath;
        }
        const basePathRegex = new RegExp(`^${basePath}`);

        const path = pathname.replace(basePathRegex, '');
        const method = normalizeMethod(ctx.request.method);

        const { handler, allowed, params } = trie.find(path, method);

        if (!handler) {
            // Method exists but not allowed for this route
            if (allowed && allowed.length) {
                return toAstroResponse(
                    methodNotAllowed('Method Not Allowed', {
                        Allow: allowed.join(', '),
                    })
                );
            }
            // No route matched at all → 404
            const notFoundHandler = options.onNotFound ? options.onNotFound() : notFound('Not Found');
            return toAstroResponse(notFoundHandler);
        }

        // Match found → delegate to handler
        return defineHandler(handler)({ ...ctx, params: { ...ctx.params, ...params } });
    };
}
