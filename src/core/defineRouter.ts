import type { APIRoute } from 'astro';
import { defineHandler, type RoutifyContext } from './defineHandler';
import { internalError, methodNotAllowed, notFound, toAstroResponse } from './responseHelpers';
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

    /**
     * Custom error handler for the router.
     */
    onError?: (error: unknown, ctx: RoutifyContext) => HandlerResult | Response;
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
        trie.insert(route);
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

    const handler = defineHandler(async (routifyCtx: RoutifyContext): Promise<Response> => {
        const url = new URL(routifyCtx.request.url);
        const pathname = url.pathname;

        routifyCtx.searchParams = url.searchParams;
        const query: Record<string, string | string[]> = {};
        url.searchParams.forEach((value, key) => {
            const existing = query[key];
            if (existing !== undefined) {
                if (Array.isArray(existing)) {
                    existing.push(value);
                } else {
                    query[key] = [existing, value];
                }
            } else {
                query[key] = value;
            }
        });
        routifyCtx.query = query;
        routifyCtx.state = {};

        let path = pathname;
        if (basePath !== '') {
            if (!pathname.startsWith(basePath)) {
                return toAstroResponse(options.onNotFound ? options.onNotFound() : notFound('Not Found'));
            }

            const nextChar = pathname.charAt(basePath.length);
            if (nextChar !== '' && nextChar !== '/') {
                return toAstroResponse(options.onNotFound ? options.onNotFound() : notFound('Not Found'));
            }

            path = pathname.slice(basePath.length);
        }

        const method = normalizeMethod(routifyCtx.request.method);
        const { route, allowed, params } = trie.find(path, method);

        if (options.debug) {
            console.log(
                `[RouterBuilder] ${method} ${path} -> ${
                    route ? 'matched' : allowed && allowed.length ? '405' : '404'
                }`
            );
        }

        if (!route) {
            // Method exists but not allowed for this route
            if (allowed && allowed.length) {
                return toAstroResponse(
                    methodNotAllowed('Method Not Allowed', {
                        Allow: allowed.join(', '),
                    })
                );
            }
            // No route matched at all → 404
            return toAstroResponse(options.onNotFound ? options.onNotFound() : notFound('Not Found'));
        }

        // Match found → delegate to handler with middlewares
        routifyCtx.params = { ...routifyCtx.params, ...params };

        try {
            const middlewares = route.middlewares || [];
            
            let index = -1;
            const next = async (): Promise<Response> => {
                index++;
                if (index < middlewares.length) {
                    const mw = middlewares[index];
                    const res = await mw(routifyCtx, next);
                    return res instanceof Response ? res : toAstroResponse(res as any);
                } else {
                    const result = await route.handler(routifyCtx);
                    return result instanceof Response ? result : toAstroResponse(result);
                }
            };

            return await next();
        } catch (err) {
            if (options.onError) {
                const errorRes = options.onError(err, routifyCtx);
                return errorRes instanceof Response ? errorRes : toAstroResponse(errorRes);
            }
            throw err;
        }
    });

    (handler as any).routes = routes;
    (handler as any).options = options;

    return handler;
}
