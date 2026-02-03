import { HttpMethod } from './HttpMethod';
import { defineRoute, type Route } from './defineRoute';
import { Handler } from "./defineHandler";
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
    private basePath: string;
    private routes: Route[] = [];

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
     * Registers a GET route under the group's base path.
     *
     * @param path - Path relative to the base path (e.g. "/:id")
     * @param handler - The handler function for this route
     */
    addGet(path: string, handler: Handler): this {
        return this.add(HttpMethod.GET, path, handler);
    }

    /**
     * Registers a POST route under the group's base path.
     *
     * @param path - Path relative to the base path
     * @param handler - The handler function for this route
     */
    addPost(path: string, handler: Handler): this {
        return this.add(HttpMethod.POST, path, handler);
    }

    /**
     * Registers a PUT route under the group's base path.
     *
     * @param path - Path relative to the base path
     * @param handler - The handler function for this route
     */
    addPut(path: string, handler: Handler): this {
        return this.add(HttpMethod.PUT, path, handler);
    }

    /**
     * Registers a DELETE route under the group's base path.
     *
     * @param path - Path relative to the base path
     * @param handler - The handler function for this route
     */
    addDelete(path: string, handler: Handler): this {
        return this.add(HttpMethod.DELETE, path, handler);
    }

    /**
     * Registers a PATCH route under the group's base path.
     *
     * @param path - Path relative to the base path
     * @param handler - The handler function for this route
     */
    addPatch(path: string, handler: Handler): this {
        return this.add(HttpMethod.PATCH, path, handler);
    }

    /**
     * Registers a route under the group's base path.
     * 
     * @param method - HTTP verb
     * @param path - Path relative to the base path
     * @param handler - The handler function for this route
     * @returns The current group instance
     */
    add(method: HttpMethod, path: string, handler: Handler): this {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        this.routes.push(
            defineRoute(method, `${this.basePath}${normalizedPath}`, handler)
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
    }
    return group;
}
