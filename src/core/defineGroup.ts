import { HttpMethod } from './HttpMethod';
import { defineRoute, type Route } from './defineRoute';
import { Handler } from "./defineHandler";

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
     * Internal method to register a route under the group with any HTTP method.
     *
     * @param method - HTTP verb
     * @param subPath - Route path relative to the base
     * @param handler - The handler function for this route
     */
    private add(method: HttpMethod, subPath: string, handler: Handler): this {
        const normalizedPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
        this.routes.push(
            defineRoute(method, `${this.basePath}${normalizedPath}`, handler)
        );
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
 *
 * @example
 * const users = defineGroup('/users', (group) => {
 *   group.addGet('/:id', handler);
 * });
 */
export function defineGroup(
    basePath: string,
    configure?: (group: RouteGroup) => void
): RouteGroup {
    const group = new RouteGroup(basePath);
    if (configure) configure(group);
    return group;
}
