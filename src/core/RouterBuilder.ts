import type {APIRoute} from 'astro';
import {defineRoute, isRoute, type Route} from './defineRoute';
import {defineRouter, type RouterOptions} from './defineRouter';
import {defineGroup, RouteGroup} from './defineGroup';
import {type Middleware} from './defineHandler';
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
    private _groups: RouteGroup[] = [];
    private _middlewares: Middleware[] = [];
    private _shouldLog = false;
    private static _registerWarned = false;

    /**
     * A global RouterBuilder instance for easy, centralized route registration.
     */
    static readonly global = new RouterBuilder();

    constructor(options?: RouterOptions) {
        this._options = {
            basePath: '/api',
            ...options,
        };

        if (
            (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
            (import.meta as any).env?.DEV ||
            this._options.debug
        ) {
            this._shouldLog = true;
        }
    }

    /**
     * Adds a global middleware to all routes registered in this builder.
     * 
     * @param middleware - The middleware function.
     * @returns The current builder instance.
     */
    use(middleware: Middleware): this {
        this._middlewares.push(middleware);
        return this;
    }

    /**
     * Creates and adds a new route group to the builder.
     * 
     * @param basePath - The base path for the group.
     * @param configure - Optional callback to configure the group.
     * @returns The created RouteGroup instance.
     */
    group(basePath: string, configure?: (group: RouteGroup) => void): RouteGroup {
        const group = defineGroup(basePath, configure);
        this.addGroup(group);
        return group;
    }

    /**
     * Adds all routes and groups that have been auto-registered via `defineRoute(..., true)`
     * or `defineGroup(..., true)`.
     *
     * @returns The current builder instance.
     */
    addRegistered(): this {
        const items = globalRegistry.getItems();

        if (this._shouldLog && items.length > 0) {
            console.log(`\x1b[36m[astro-routify]\x1b[0m Auto-registering ${items.length} items from global registry...`);
        }

        const lastRouteIndex = new Map<string, number>();
        const routesByKey = new Map<string, Route>();
        const lastGroupIndex = new Map<string, number>();
        const groupsByKey = new Map<string, RouteGroup>();

        items.forEach((item, index) => {
            if (item && typeof item === 'object' && (item as any)._routifyType === 'group') {
                const key = (item as RouteGroup).getBasePath();
                lastGroupIndex.set(key, index);
                groupsByKey.set(key, item as RouteGroup);
            } else if (isRoute(item)) {
                const key = `${item.method}:${item.path}`;
                lastRouteIndex.set(key, index);
                routesByKey.set(key, item);
            }
        });

        items.forEach((item, index) => {
            if (item && typeof item === 'object' && (item as any)._routifyType === 'group') {
                const key = (item as RouteGroup).getBasePath();
                if (lastGroupIndex.get(key) === index) this.addGroup(groupsByKey.get(key)!);
            } else if (isRoute(item)) {
                const key = `${item.method}:${item.path}`;
                if (lastRouteIndex.get(key) === index) this.addRoute(routesByKey.get(key)!);
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
        const keys = Object.keys(modules).sort();
        
        if (this._shouldLog && keys.length > 0) {
            console.log(`\x1b[36m[astro-routify]\x1b[0m Exploring ${keys.length} modules for routes...`);
        }

        keys.forEach((key) => {
            const m = modules[key];
            if (m && typeof m === 'object' && (m as any)._routifyType === 'group') {
                this.addGroup(m as RouteGroup);
            } else if (isRoute(m)) {
                this.addRoute(m);
            } else if (typeof m === 'object' && m !== null) {
                Object.values(m).forEach((val) => {
                    if (val && typeof val === 'object' && (val as any)._routifyType === 'group') {
                        this.addGroup(val as RouteGroup);
                    } else if (isRoute(val)) {
                        this.addRoute(val);
                    } else if (Array.isArray(val)) {
                        val.forEach((item) => {
                            if (isRoute(item)) {
                                this.addRoute(item);
                            } else if (item && typeof item === 'object' && (item as any)._routifyType === 'group') {
                                this.addGroup(item as RouteGroup);
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
    logRoutes(allRoutes?: Route[]): this {
        const basePath = this._options.basePath || '/api';
        const normalizedBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`;

        console.log(`\x1b[36m[astro-routify]\x1b[0m Registered routes (basePath: \x1b[33m${normalizedBasePath}\x1b[0m):`);
        
        const routesToLog = allRoutes || [...this._routes];
        if (!allRoutes) {
            for (const group of this._groups) {
                routesToLog.push(...group.getRoutes());
            }
        }

        if (routesToLog.length === 0) {
            console.log(`  \x1b[33m(no routes registered)\x1b[0m`);
            return this;
        }

        const limit = 30;
        routesToLog.slice(0, limit).forEach((r) => {
            const fullPath = normalizedBasePath === '/' ? r.path : `${normalizedBasePath}${r.path}`;
            console.log(`  \x1b[32m${r.method.padEnd(7)}\x1b[0m ${fullPath}`);
        });
        if (routesToLog.length > limit) {
            console.log(`  ... and ${routesToLog.length - limit} more`);
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
        this._groups.push(group);
        return this;
    }

    /**
     * Adds a GET route.
     * @param path Route path (e.g., `/items/:id`)
     * @param handlers Middleware(s) followed by a request handler function.
     */
    addGet(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.GET, path, ...handlers);
    }

    /**
     * Adds a POST route.
     * @param path Route path.
     * @param handlers Middleware(s) followed by a request handler function.
     */
    addPost(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.POST, path, ...handlers);
    }

    /**
     * Adds a PUT route.
     * @param path Route path.
     * @param handlers Middleware(s) followed by a request handler function.
     */
    addPut(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.PUT, path, ...handlers);
    }

    /**
     * Adds a DELETE route.
     * @param path Route path.
     * @param handlers Middleware(s) followed by a request handler function.
     */
    addDelete(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.DELETE, path, ...handlers);
    }

    /**
     * Adds a PATCH route.
     * @param path Route path.
     * @param handlers Middleware(s) followed by a request handler function.
     */
    addPatch(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.PATCH, path, ...handlers);
    }

    /**
     * Internal helper to add a route with any HTTP method.
     *
     * @param method The HTTP method.
     * @param subPath Path segment (can be relative or absolute).
     * @param args Middleware(s) and handler.
     * @returns The current builder instance (for chaining).
     */
    private add(method: HttpMethod, subPath: string, ...args: any[]): this {
        let metadata: Record<string, any> | undefined;
        if (args.length > 1 && typeof args[args.length - 1] === 'object' && typeof args[args.length - 2] === 'function') {
            metadata = args.pop();
        }
        const handler = args.pop();
        const middlewares = args;
        const normalizedPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
        this._routes.push(
            defineRoute({
                method,
                path: normalizedPath,
                handler,
                middlewares,
                metadata
            })
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
        // Collect all routes from builder and groups
        const allRoutes = [...this._routes];
        for (const group of this._groups) {
            allRoutes.push(...group.getRoutes());
        }

        if (this._shouldLog) {
            this.logRoutes(allRoutes);
        }

        // Detect duplicates
        const seen = new Set<string>();
        for (const route of allRoutes) {
            const key = `${route.method}:${route.path}`;
            if (seen.has(key)) {
                console.warn(`\x1b[33m[astro-routify]\x1b[0m Duplicate route detected: ${key}. The last one will be used.`);
            }
            seen.add(key);
        }

        // Apply global middlewares to all routes before building
        const finalRoutes = allRoutes.map(route => ({
            ...route,
            middlewares: [...this._middlewares, ...(route.middlewares || [])]
        }));

        return defineRouter(finalRoutes, this._options);
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

    if (modulesOrOptions && typeof modulesOrOptions === 'object' && !('basePath' in modulesOrOptions || 'onNotFound' in modulesOrOptions || 'debug' in modulesOrOptions || 'onError' in modulesOrOptions)) {
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
