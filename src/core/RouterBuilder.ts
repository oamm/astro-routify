import {defineRoute, type Route} from './defineRoute';
import {defineRouter, type RouterOptions} from './defineRouter';
import {RouteGroup} from './defineGroup';
import {type Handler} from './defineHandler';
import {HttpMethod} from './HttpMethod';

/**
 * A fluent builder for creating and composing API routes in Astro.
 *
 * `RouterBuilder` supports both simple method-based additions (`addGet`, `addPost`, etc.)
 * and organized groups via `defineGroup()` + `addGroup()` for scalable applications.
 *
 * @example Basic usage:
 * ```ts
 * const router = new RouterBuilder()
 *   .addGet('/ping', () => ok('pong'))
 *   .addPost('/submit', handler);
 *
 * export const ALL = router.build();
 * ```
 *
 * @example Using groups:
 * ```ts
 * const users = defineGroup('/users')
 *   .addGet('/:id', userHandler);
 *
 * const router = new RouterBuilder({ basePath: '/api' })
 *   .addGroup(users);
 *
 * export const GET = router.build();
 * ```
 */
export class RouterBuilder {
    private _options: RouterOptions;
    private _routes: Route[] = [];
    private static _registerWarned = false;

    constructor(options?: RouterOptions) {
        this._options = {
            basePath: 'api',
            ...options,
        };
    }

    /**
     * @deprecated Prefer `addGroup()` or `addRoute()` for structured routing.
     *
     * Registers a single route manually.
     *
     * This method is deprecated in favor of a more scalable and organized approach using
     * `defineGroup()` + `addGroup()` or `addRoute()` for ad-hoc additions.
     *
     * @param route A single `Route` object to register.
     */
    register(route: Route): void;

    /**
     * @deprecated Prefer `addGroup()` or `addRoute()` for structured routing.
     *
     * Registers multiple routes at once.
     *
     * This method is deprecated and discouraged for larger codebases in favor of group-based composition.
     *
     * @param routes An array of `Route` objects to register.
     */
    register(routes: Route[]): void;

    /**
     * @deprecated Prefer `addGroup()` or `addRoute()` for structured routing.
     *
     * Registers one or more routes, supporting both a single `Route` or an array of them.
     *
     * Internally used by the two overloads above. Emits a console warning once per runtime.
     *
     * @param routeOrRoutes Either a single `Route` or an array of `Route`s.
     */
    register(routeOrRoutes: Route | Route[]): void {
        if (!RouterBuilder._registerWarned) {
            console.warn(
                '[RouterBuilder] register() is deprecated. Use defineGroup() + addGroup() for route grouping and better structure.'
            );
            RouterBuilder._registerWarned = true;
        }

        if (Array.isArray(routeOrRoutes)) {
            this._routes.push(...routeOrRoutes);
        } else {
            this._routes.push(routeOrRoutes);
        }
    }

    /**
     * Adds a single route to the router.
     *
     * @param route The route to add.
     * @returns The current builder instance (for chaining).
     */
    addRoute(route: Route): this {
        this._routes.push(route);
        return this;
    }

    /**
     * Adds a group of pre-defined routes (from `defineGroup()`).
     *
     * @param group A `RouteGroup` instance.
     * @returns The current builder instance (for chaining).
     */
    addGroup(group: RouteGroup): this {
        this._routes.push(...group.getRoutes());
        return this;
    }

    /**
     * Adds a GET route.
     * @param path Route path (e.g., `/items/:id`)
     * @param handler Request handler function.
     */
    addGet(path: string, handler: Handler): this {
        return this.add(HttpMethod.GET, path, handler);
    }

    /**
     * Adds a POST route.
     * @param path Route path.
     * @param handler Request handler function.
     */
    addPost(path: string, handler: Handler): this {
        return this.add(HttpMethod.POST, path, handler);
    }

    /**
     * Adds a PUT route.
     * @param path Route path.
     * @param handler Request handler function.
     */
    addPut(path: string, handler: Handler): this {
        return this.add(HttpMethod.PUT, path, handler);
    }

    /**
     * Adds a DELETE route.
     * @param path Route path.
     * @param handler Request handler function.
     */
    addDelete(path: string, handler: Handler): this {
        return this.add(HttpMethod.DELETE, path, handler);
    }

    /**
     * Adds a PATCH route.
     * @param path Route path.
     * @param handler Request handler function.
     */
    addPatch(path: string, handler: Handler): this {
        return this.add(HttpMethod.PATCH, path, handler);
    }

    /**
     * Internal helper to add a route with any HTTP method.
     *
     * @param method The HTTP method.
     * @param subPath Path segment (can be relative or absolute).
     * @param handler Request handler.
     * @returns The current builder instance (for chaining).
     */
    private add(method: HttpMethod, subPath: string, handler: Handler): this {
        const normalizedPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
        this._routes.push(
            defineRoute(method, normalizedPath, handler)
        );
        return this;
    }

    /**
     * Finalizes the router and returns an Astro-compatible route handler.
     *
     * This function should be used to export a method like `GET`, `POST`, or `ALL`
     * inside Astro API endpoints.
     *
     * @returns A fully resolved Astro route handler.
     */
    build() {
        return defineRouter(this._routes, this._options);
    }
}
