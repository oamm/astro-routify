import type { APIContext } from 'astro';
import { HttpMethod } from './HttpMethod';
import { Route } from './defineRoute';
import { createJsonStreamRoute, JsonStreamWriter } from './internal/createJsonStreamRoute';

/**
 * Defines a JSON streaming route using NDJSON (Newline Delimited JSON) format.
 *
 * This helper streams individual JSON objects separated by newlines (`\n`)
 * instead of a single JSON array. It sets the `Content-Type` to
 * `application/x-ndjson` and disables buffering to allow low-latency
 * delivery of each item.
 *
 * Ideal for real-time updates, event logs, progressive loading, or
 * integrations with LLMs or dashboards where each object can be processed
 * as soon as it's received.
 *
 * @example
 * streamJsonND('/events', async ({ response }) => {
 *   response.send({ type: 'start' });
 *   await delay(100);
 *   response.send({ type: 'progress', percent: 25 });
 *   response.close();
 * });
 *
 * @param path - The route path (e.g. `/events`)
 * @param handler - A function that receives `ctx` and a JSON stream writer
 * @param options - Optional HTTP method override (default is GET)
 * @returns A Route object ready to be registered with `defineRouter`
 */
export function streamJsonND(
    path: string,
    handler: (ctx: APIContext & { response: JsonStreamWriter }) => void | Promise<void>,
    options?: { method?: HttpMethod }
): Route {
    return createJsonStreamRoute(path, handler, {
        mode: 'ndjson',
        method: options?.method ?? HttpMethod.GET,
    });
}
