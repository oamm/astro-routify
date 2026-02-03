import type { APIContext } from 'astro';
import { HttpMethod } from './HttpMethod';
import { Route } from './defineRoute';
import { createJsonStreamRoute, JsonStreamWriter } from './internal/createJsonStreamRoute';

/**
 * Defines a JSON streaming route that emits a valid JSON array.
 *
 * This helper returns a valid `application/json` response containing
 * a streamable array of JSON values. Useful for large state exports
 * or APIs where the full array can be streamed as it's generated.
 *
 * Unlike `streamJsonND()`, this wraps all values in `[` and `]`
 * and separates them with commas.
 *
 * @example
 * streamJsonArray('/users', async ({ response }) => {
 *   response.send({ id: 1 });
 *   response.send({ id: 2 });
 *   response.close();
 * });
 *
 * @param path - The route path (e.g. `/users`)
 * @param handler - A function that receives `ctx` and a JSON stream writer
 * @param options - Optional HTTP method override (default is GET)
 * @returns A Route object ready to be registered with `defineRouter`
 */
export function streamJsonArray(
    path: string,
    handler: (ctx: APIContext & { response: JsonStreamWriter }) => void | Promise<void>,
    options?: { method?: HttpMethod }
): Route {
    return createJsonStreamRoute(path, handler, {
        mode: 'array',
        method: options?.method ?? HttpMethod.GET,
    });
}
