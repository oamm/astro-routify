import type {APIRoute} from 'astro';
import {defineRoute, isRoute, type Route} from './defineRoute';
import {defineRouter, type RouterOptions} from './defineRouter';
import {RouteGroup} from './defineGroup';
import {type Handler} from './defineHandler';
import {HttpMethod} from './HttpMethod';
import {globalRegistry} from './registry';

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
 *
 * @example Auto-discovering routes via Vite glob:
 * ```ts
 * const router = new RouterBuilder()
 *   .addModules(import.meta.glob('./**\/*.routes.ts', { eager: true }));
 *
 * export const ALL = router.build();
 * ```
 */
export class RouterBuilder {
    private _options: RouterOptions;
    private _routes: Route[] = [];
    private _shouldLog = false;
    private static _registerWarned = false;

    /**
     * A global RouterBuilder instance for easy, centralized route registration.
     */
    static readonly global = new RouterBuilder();

    constructor(options?: RouterOptions) {
        this._options = {
            basePath: 'api',
            ...options,
        };

        if (
            (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
            (import.meta as any).env?.DEV
        ) {
            this._shouldLog = true;
        }
    }

    /**
     * Adds all routes and groups that have been auto-registered via `defineRoute(..., true)`
     * or `defineGroup(..., true)`.
     *
     * @returns The current builder instance.
     */
    addRegistered(): this {
        globalRegistry.getItems().forEach((item) => {
            if (item instanceof RouteGroup) {
                this.addGroup(item);
            } else if (isRoute(item)) {
                this.addRoute(item);
            }
        });
        return this;
    }

    /**
     * Bulk registers routes and groups from a module collection.
     * Ideal for use with Vite's `import.meta.glob` (with `{ eager: true }`).
     *
     * It will search for both default and named exports that are either `Route` or `RouteGroup`.
     *
     * @param modules A record of modules (e.g. from `import.meta.glob`).
     * @returns The current builder instance.
     */
    addModules(modules: Record<string, any>): this {
        Object.values(modules).forEach((m) => {
            if (m instanceof RouteGroup) {
                this.addGroup(m);
            } else if (isRoute(m)) {
                this.addRoute(m);
            } else if (typeof m === 'object' && m !== null) {
                Object.values(m).forEach((val) => {
                    if (val instanceof RouteGroup) {
                        this.addGroup(val);
                    } else if (isRoute(val)) {
                        this.addRoute(val);
                    } else if (Array.isArray(val)) {
                        val.forEach((item) => {
                            if (isRoute(item)) {
                                this.addRoute(item);
                            } else if (item instanceof RouteGroup) {
                                this.addGroup(item);
                            }
                        });
                    }
                });
            }
        });
        return this;
    }

    /**
     * Prints all registered routes to the console.
     * Useful for debugging during development.
     *
     * @returns The current builder instance.
     */
    logRoutes(): this {
        console.log(`\x1b[36m[RouterBuilder]\x1b[0m Registered routes:`);
        const limit = 30;
        this._routes.slice(0, limit).forEach((r) => {
            console.log(`  \x1b[32m${r.method.padEnd(7)}\x1b[0m ${r.path}`);
        });
        if (this._routes.length > limit) {
            console.log(`  ... and ${this._routes.length - limit} more`);
        }
        return this;
    }

    /**
     * Disables the automatic logging of routes that happens in development mode.
     *
     * @returns The current builder instance.
     */
    disableLogging(): this {
        this._shouldLog = false;
        return this;
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
        if (this._shouldLog) {
            this.logRoutes();
        }
        return defineRouter(this._routes, this._options);
    }
}

/**
 * A convenience helper to create a router.
 *
 * If modules are provided (e.g. from Vite's `import.meta.glob`), they will be registered.
 * If no modules are provided, it will automatically include all routes that were
 * registered via the auto-registration flags (`defineRoute(..., true)`).
 *
 * @example Auto-discovery via glob:
 * ```ts
 * export const ALL = createRouter(import.meta.glob('./**\/*.ts', { eager: true }));
 * ```
 *
 * @example Auto-registration via global registry:
 * ```ts
 * export const ALL = createRouter();
 * ```
 *
 * @param modulesOrOptions Either modules to register or router options.
 * @param options Router options (if first arg is modules).
 * @returns An Astro-compatible route handler.
 */
export function createRouter(
    modulesOrOptions?: Record<string, any> | RouterOptions,
    options?: RouterOptions
): APIRoute {
    let modules: Record<string, any> | undefined;
    let finalOptions: RouterOptions | undefined;

    if (modulesOrOptions && !('basePath' in modulesOrOptions || 'onNotFound' in modulesOrOptions || 'debug' in modulesOrOptions)) {
        modules = modulesOrOptions as Record<string, any>;
        finalOptions = options;
    } else {
        finalOptions = modulesOrOptions as RouterOptions;
    }

    const builder = new RouterBuilder(finalOptions);

    if (modules) {
        builder.addModules(modules);
    }
    
    builder.addRegistered();

    return builder.build();
}
