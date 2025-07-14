import { ALLOWED_HTTP_METHODS, HttpMethod } from './HttpMethod';
import type { Handler } from './defineHandler';

export interface Route {
	method: HttpMethod;
	path: string;
	handler: Handler;
}

export function defineRoute(route: Route): Route;

export function defineRoute(method: HttpMethod, path: string, handler: Handler): Route;

export function defineRoute(
	methodOrRoute: HttpMethod | Route,
	maybePath?: string,
	maybeHandler?: Handler
): Route {
	if (typeof methodOrRoute === 'object') {
		validateRoute(methodOrRoute);
		return methodOrRoute;
	}

	const route: Route = { method: methodOrRoute, path: maybePath!, handler: maybeHandler! };
	validateRoute(route);
	return route;
}

function validateRoute({ method, path }: Route) {
	if (!path.startsWith('/')) {
		throw new Error(`Route path must start with '/': ${path}`);
	}
	if (!ALLOWED_HTTP_METHODS.has(method)) {
		throw new Error(`Unsupported HTTP method in route: ${method}`);
	}
}
