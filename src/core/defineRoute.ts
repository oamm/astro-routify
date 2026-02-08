import { ALLOWED_HTTP_METHODS, HttpMethod } from './HttpMethod';
import type { Handler, Middleware } from './defineHandler';
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

	/**
	 * Optional array of middlewares to run before the handler.
	 */
	middlewares?: Middleware[];

	/**
	 * Optional metadata for the route (e.g. for OpenAPI generation).
	 */
	metadata?: Record<string, any>;

	/**
	 * Internal marker to identify the object type during module discovery.
	 * @internal
	 */
	_routifyType?: 'route';
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

    route._routifyType = 'route';

	validateRoute(route);

	if (autoRegister) {
		globalRegistry.register(route);
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' || (import.meta as any).env?.DEV) {
            console.log(`\x1b[36m[astro-routify]\x1b[0m route registered: \x1b[32m${route.method}\x1b[0m \x1b[33m${route.path}\x1b[0m`);
        }
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
    if (path.includes('**') && !path.endsWith('**')) {
        throw new Error(`Catch-all '**' is only allowed at the end of a path: ${path}`);
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
        (obj._routifyType === 'route' || 
            (typeof obj.method === 'string' &&
             typeof obj.path === 'string' &&
             typeof obj.handler === 'function'))
    );
}
