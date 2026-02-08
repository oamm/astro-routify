import { HttpMethod } from './HttpMethod';
import { defineRoute, type Route } from './defineRoute';
import { Middleware } from "./defineHandler";
import { globalRegistry } from './registry';

/**
 * Represents a group of routes under a shared base path.
 *
 * Use this class to organize related endpoints, applying a consistent prefix
 * and reducing duplication when defining similar routes.
 *
 * @example
 * const users = new RouteGroup('/users')
 *   .addGet('/:id', handler)
 *   .addPost('/', createUser);
 */
export class RouteGroup {
    readonly _routifyType = 'group';
    private basePath: string;
    private routes: Route[] = [];
    private middlewares: Middleware[] = [];

    /**
     * Creates a new route group with the specified base path.
     * Trailing slashes are automatically removed.
     *
     * @param basePath - The common prefix for all routes in the group (e.g. "/users")
     */
    constructor(basePath: string) {
        this.basePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    }

    /**
     * Returns the normalized base path used by the group.
     */
    getBasePath() {
        return this.basePath;
    }

    /**
     * Adds a middleware to all routes in this group.
     * 
     * @param middleware - The middleware function to add
     * @returns The current group instance
     */
    use(middleware: Middleware): this {
        this.middlewares.push(middleware);
        // Apply to already registered routes in this group
        for (const route of this.routes) {
            if (!route.middlewares) route.middlewares = [];
            route.middlewares.push(middleware);
        }
        return this;
    }

    /**
     * Registers a GET route under the group's base path.
     *
     * @param path - Path relative to the base path (e.g. "/:id")
     * @param handlers - Middleware(s) followed by a handler function
     */
    addGet(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.GET, path, ...handlers);
    }

    /**
     * Registers a POST route under the group's base path.
     *
     * @param path - Path relative to the base path
     * @param handlers - Middleware(s) followed by a handler function
     */
    addPost(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.POST, path, ...handlers);
    }

    /**
     * Registers a PUT route under the group's base path.
     *
     * @param path - Path relative to the base path
     * @param handlers - Middleware(s) followed by a handler function
     */
    addPut(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.PUT, path, ...handlers);
    }

    /**
     * Registers a DELETE route under the group's base path.
     *
     * @param path - Path relative to the base path
     * @param handlers - Middleware(s) followed by a handler function
     */
    addDelete(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.DELETE, path, ...handlers);
    }

    /**
     * Registers a PATCH route under the group's base path.
     *
     * @param path - Path relative to the base path
     * @param handlers - Middleware(s) followed by a handler function
     */
    addPatch(path: string, ...handlers: any[]): this {
        return this.add(HttpMethod.PATCH, path, ...handlers);
    }

    /**
     * Registers a route under the group's base path.
     * 
     * @param method - HTTP verb
     * @param path - Path relative to the base path
     * @param args - Middleware(s) and handler
     * @returns The current group instance
     */
    add(method: HttpMethod, path: string, ...args: any[]): this {
        let metadata: Record<string, any> | undefined;
        if (args.length > 1 && typeof args[args.length - 1] === 'object' && typeof args[args.length - 2] === 'function') {
            metadata = args.pop();
        }
        const handler = args.pop();
        const middlewares = args;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        this.routes.push(
            defineRoute({
                method,
                path: `${this.basePath}${normalizedPath}`,
                handler,
                middlewares: [...this.middlewares, ...middlewares],
                metadata
            })
        );
        return this;
    }

    /**
     * Registers the group and all its current routes to the global registry.
     */
    register(): this {
        globalRegistry.register(this);
        return this;
    }

    /**
     * Returns all the registered routes in the group.
     */
    getRoutes(): Route[] {
        return this.routes;
    }
}

/**
 * Helper to define a `RouteGroup` with optional inline configuration.
 *
 * @param basePath - The base path prefix for all routes
 * @param configure - Optional callback to configure the group inline
 * @param autoRegister - If true, registers the group to the global registry
 *
 * @example
 * const users = defineGroup('/users', (group) => {
 *   group.addGet('/:id', handler);
 * }, true);
 */
export function defineGroup(
    basePath: string,
    configure?: (group: RouteGroup) => void,
    autoRegister?: boolean
): RouteGroup {
    const group = new RouteGroup(basePath);
    if (configure) configure(group);
    if (autoRegister) {
        globalRegistry.register(group);
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' || (import.meta as any).env?.DEV) {
            console.log(`\x1b[36m[astro-routify]\x1b[0m group registered: \x1b[33m${group.getBasePath()}\x1b[0m`);
        }
    }
    return group;
}
