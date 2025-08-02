import { ALLOWED_HTTP_METHODS, HttpMethod } from './HttpMethod';
import type { Handler } from './defineHandler';

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
 * @returns The validated Route object
 */
export function defineRoute(route: Route): Route;

/**
 * Defines a route by specifying its method, path, and handler explicitly.
 *
 * @example
 * defineRoute('POST', '/login', handler);
 *
 * @param method - HTTP method to match
 * @param path - Route path (must start with `/`)
 * @param handler - Function to handle the matched request
 * @returns The validated Route object
 */
export function defineRoute(method: HttpMethod, path: string, handler: Handler): Route;

/**
 * Internal route definition logic that supports both overloads.
 */
export function defineRoute(
	methodOrRoute: HttpMethod | Route,
	maybePath?: string,
	maybeHandler?: Handler
): Route {
	if (typeof methodOrRoute === 'object') {
		validateRoute(methodOrRoute);
		return methodOrRoute;
	}

	const route: Route = {
		method: methodOrRoute,
		path: maybePath!,
		handler: maybeHandler!,
	};

	validateRoute(route);
	return route;
}

/**
 * Ensures the route is properly formed and uses a valid method + path format.
 *
 * @param route - Route to validate
 * @throws If method is unsupported or path doesn't start with `/`
 */
function validateRoute({ method, path }: Route) {
	if (!path.startsWith('/')) {
		throw new Error(`Route path must start with '/': ${path}`);
	}
	if (!ALLOWED_HTTP_METHODS.has(method)) {
		throw new Error(`Unsupported HTTP method in route: ${method}`);
	}
}
