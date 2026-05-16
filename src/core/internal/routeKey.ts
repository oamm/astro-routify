import type { Route } from '../defineRoute';

export function routeKey(route: Pick<Route, 'method' | 'path'>): string {
    return `${route.method}:${route.path}`;
}

