import { HttpMethod } from './HttpMethod';
import { defineRoute } from './defineRoute';

/**
 * Decorator factory for HTTP methods.
 */
function createMethodDecorator(method: HttpMethod) {
    return function (path: string) {
        return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
            const handler = descriptor ? descriptor.value : target[propertyKey];
            if (typeof handler === 'function') {
                defineRoute(method, path, handler, true);
            }
        };
    };
}

/**
 * @Get decorator - auto-registers a GET route.
 */
export const Get = createMethodDecorator(HttpMethod.GET);

/**
 * @Post decorator - auto-registers a POST route.
 */
export const Post = createMethodDecorator(HttpMethod.POST);

/**
 * @Put decorator - auto-registers a PUT route.
 */
export const Put = createMethodDecorator(HttpMethod.PUT);

/**
 * @Delete decorator - auto-registers a DELETE route.
 */
export const Delete = createMethodDecorator(HttpMethod.DELETE);

/**
 * @Patch decorator - auto-registers a PATCH route.
 */
export const Patch = createMethodDecorator(HttpMethod.PATCH);

/**
 * @RouteGroup decorator - can be used on classes to auto-register a group.
 * Note: This requires the class to have a static method or property that returns the routes,
 * or it can be used in conjunction with method decorators.
 * 
 * For now, we'll implement a simple version that can be used on a class
 * if the class is intended to be a group.
 */
export function Group(basePath: string) {
    return function (constructor: Function) {
        // In a more advanced implementation, we could collect all methods
        // and register them as a group. For now, we'll keep it simple.
    };
}
