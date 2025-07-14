import type {Route} from './defineRoute';
import {defineRouter, type RouterOptions} from './defineRouter';

export class RouterBuilder {
    private routes: Route[] = [];

    register(route: Route): void;
    register(routes: Route[]): void;
    register(routeOrRoutes: Route | Route[]): void {
        if (Array.isArray(routeOrRoutes)) {
            this.routes.push(...routeOrRoutes);
        } else {
            this.routes.push(routeOrRoutes);
        }
    }

    build(options?: RouterOptions) {
        return defineRouter(this.routes, options);
    }
}
