import type { Route } from './defineRoute';
import { defineRouter, type RouterOptions } from './defineRouter';
import { RouteGroup } from './defineGroup';

/**
 * RouterBuilder allows the registration and composition of API routes
 * using a fluent, modular, and structured approach.
 *
 * This class replaces older manual registration patterns (`register`)
 * with support for reusable, path-aware route groups via `defineGroup()` and `addGroup()`.
 *
 * @example
 * const users = defineGroup('/users')
 *   .addGet('/:id', handler);
 *
 * const router = new RouterBuilder({ basePath: '/api' })
 *   .addGroup(users);
 *
 * export const GET = router.build();
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
     * @deprecated This method is being phased out in favor of `defineGroup()` and `addGroup()`.
     *
     * It allowed manual route registration but does not support path grouping,
     * composition, or long-term maintainability.
     *
     * Use `defineGroup()` and `addGroup()` for organized and scalable route registration.
     */
    register(route: Route): void;
    /** @deprecated See above. */
    register(routes: Route[]): void;
    /** @deprecated See above. */
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
     * Adds a single route manually.
     *
     * This is useful for advanced or dynamic cases such as:
     * - Programmatically generated routes
     * - Test scenarios
     * - Internal plugins or tooling
     *
     * For general use, prefer `defineGroup()` and `addGroup()` for better organization.
     */
    addRoute(route: Route): this {
        this._routes.push(route);
        return this;
    }

    /**
     * Adds a structured group of related routes.
     *
     * Groups are created using `defineGroup(basePath)` and support automatic namespacing.
     *
     * @example
     * const users = defineGroup('/users').addGet('/:id', handler);
     * router.addGroup(users);
     */
    addGroup(group: RouteGroup): this {
        this._routes.push(...group.getRoutes());
        return this;
    }

    /**
     * Builds and returns the final Astro API route handler.
     *
     * Routes are resolved using the current basePath (default: `/api`)
     * and will be matched dynamically at runtime.
     */
    build() {
        return defineRouter(this._routes, this._options);
    }
}
