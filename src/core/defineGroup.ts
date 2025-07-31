import {HttpMethod} from './HttpMethod';
import {defineRoute, type Route} from './defineRoute';
import {Handler} from "./defineHandler";


export class RouteGroup {
    private basePath: string;
    private routes: Route[] = [];

    constructor(basePath: string) {
        this.basePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    }

    getBasePath() {
        return this.basePath;
    }

    addGet(path: string, handler: Handler): this {
        return this.add(HttpMethod.GET, path, handler);
    }

    addPost(path: string, handler: Handler): this {
        return this.add(HttpMethod.POST, path, handler);
    }

    addPut(path: string, handler: Handler): this {
        return this.add(HttpMethod.PUT, path, handler);
    }

    addDelete(path: string, handler: Handler): this {
        return this.add(HttpMethod.DELETE, path, handler);
    }

    addPatch(path: string, handler: Handler): this {
        return this.add(HttpMethod.PATCH, path, handler);
    }

    private add(method: HttpMethod, subPath: string, handler: Handler): this {
        const normalizedPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
        this.routes.push(
            defineRoute(method, `${this.basePath}${normalizedPath}`, handler)
        );
        return this;
    }

    getRoutes(): Route[] {
        return this.routes;
    }
}

export function defineGroup(basePath: string) {
    return new RouteGroup(basePath);
}
