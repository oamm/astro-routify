import { ALLOWED_HTTP_METHODS, HttpMethod } from './HttpMethod';
import type { Handler } from './defineHandler';
import { globalRegistry } from './registry';

/**
 * Represents a single route definition.
 */
export interface Route {
	/**
	 * HTTP method to match (GET, POST, PUT, etc.).
	 */
	method: HttpMethod;

	/**
	 * Path pattern, starting with `/`, supporting static or param segments (e.g., `/users/:id`).
	 */
	path: string;

	/**
	 * The function that handles the request when matched.
	 */
	handler: Handler;
}

/**
 * Defines a route using a `Route` object.
 *
 * @example
 * defineRoute({ method: 'GET', path: '/users', handler });
 *
 * @param route - A fully constructed route object
 * @param autoRegister - If true, registers the route to the global registry
 * @returns The validated Route object
 */
export function defineRoute(route: Route, autoRegister?: boolean): Route;

/**
 * Defines a route by specifying its method, path, and handler explicitly.
 *
 * @example
 * defineRoute('POST', '/login', handler);
 *
 * @param method - HTTP method to match
 * @param path - Route path (must start with `/`)
 * @param handler - Function to handle the matched request
 * @param autoRegister - If true, registers the route to the global registry
 * @returns The validated Route object
 */
export function defineRoute(method: HttpMethod, path: string, handler: Handler, autoRegister?: boolean): Route;

/**
 * Internal route definition logic that supports both overloads.
 */
export function defineRoute(
	methodOrRoute: HttpMethod | Route,
	maybePathOrAutoRegister?: string | boolean,
	maybeHandler?: Handler,
	maybeAutoRegister?: boolean
): Route {
	let autoRegister = false;
	let route: Route;

	if (typeof methodOrRoute === 'object') {
		route = methodOrRoute;
		autoRegister = !!maybePathOrAutoRegister;
	} else {
		route = {
			method: methodOrRoute,
			path: maybePathOrAutoRegister as string,
			handler: maybeHandler!,
		};
		autoRegister = !!maybeAutoRegister;
	}

	validateRoute(route);

	if (autoRegister) {
		globalRegistry.register(route);
	}

	return route;
}

/**
 * Ensures the route is properly formed and uses a valid method + path format.
 *
 * @param route - Route to validate
 * @throws If method is unsupported or path doesn't start with `/`
 */
export function validateRoute({ method, path }: Route) {
	if (!path.startsWith('/')) {
		throw new Error(`Route path must start with '/': ${path}`);
	}
	if (!ALLOWED_HTTP_METHODS.has(method)) {
		throw new Error(`Unsupported HTTP method in route: ${method}`);
	}
}

/**
 * Checks if an object implements the `Route` interface.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid Route
 */
export function isRoute(obj: any): obj is Route {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.method === 'string' &&
        typeof obj.path === 'string' &&
        typeof obj.handler === 'function'
    );
}
