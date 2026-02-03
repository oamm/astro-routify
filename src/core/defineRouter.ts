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

    /**
     * If true, enables debug logging for route matching.
     * Useful during development to trace which route is being matched.
     */
    debug?: boolean;
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

    let basePath = options.basePath ?? '/api';
    if (basePath !== '' && !basePath.startsWith('/')) {
        basePath = '/' + basePath;
    }
    if (basePath.endsWith('/') && basePath !== '/') {
        basePath = basePath.slice(0, -1);
    }
    if (basePath === '/') {
        basePath = '';
    }

    return async (ctx: APIContext): Promise<Response> => {
        const url = new URL(ctx.request.url);
        const pathname = url.pathname;

        let path = pathname;
        if (basePath !== '') {
            if (!pathname.startsWith(basePath)) {
                const notFoundHandler = options.onNotFound ? options.onNotFound() : notFound('Not Found');
                return toAstroResponse(notFoundHandler);
            }

            const nextChar = pathname.charAt(basePath.length);
            if (nextChar !== '' && nextChar !== '/') {
                const notFoundHandler = options.onNotFound ? options.onNotFound() : notFound('Not Found');
                return toAstroResponse(notFoundHandler);
            }

            path = pathname.slice(basePath.length);
        }

        const method = normalizeMethod(ctx.request.method);
        const { handler, allowed, params } = trie.find(path, method);

        if (options.debug) {
            console.log(
                `[RouterBuilder] ${method} ${path} -> ${
                    handler ? 'matched' : allowed && allowed.length ? '405' : '404'
                }`
            );
        }

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
