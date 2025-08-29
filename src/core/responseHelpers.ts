import {BodyInit, HeadersInit} from 'undici';

/**
 * A standardized shape for internal route result objects.
 * These are later converted into native `Response` instances.
 */
export interface ResultResponse<T = unknown> {
    /**
     * Optional body content (can be a string, object, or binary).
     */
    body?: T;

    /**
     * HTTP status code (e.g. 200, 404, 500).
     */
    status: number;

    /**
     * Optional response headers.
     */
    headers?: HeadersInit;
}

/**
 * Internal helper to build a typed `ResultResponse`.
 * @param status - HTTP status code
 * @param body - Optional response body
 * @param headers - Optional headers
 */
function createResponse<T>(
    status: number,
    body?: T,
    headers?: HeadersInit
): ResultResponse<T> {
    return {status, body, headers};
}

/**
 * 200 OK
 */
export const ok = <T>(body: T, headers?: HeadersInit) =>
    createResponse(200, body, headers);

/**
 * 201 Created
 */
export const created = <T>(body: T, headers?: HeadersInit) =>
    createResponse(201, body, headers);

/**
 * 204 No Content
 */
export const noContent = (headers?: HeadersInit) =>
    createResponse(204, undefined, headers);

/**
 * 304 Not Modified
 */
export const notModified = (headers?: HeadersInit) =>
    createResponse(304, undefined, headers);

/**
 * 400 Bad Request
 */
export const badRequest = <T = string>(
    body: T = 'Bad Request' as unknown as T,
    headers?: HeadersInit
) => createResponse(400, body, headers);

/**
 * 401 Unauthorized
 */
export const unauthorized = <T = string>(
    body: T = 'Unauthorized' as unknown as T,
    headers?: HeadersInit
) => createResponse(401, body, headers);

/**
 * 403 Forbidden
 */
export const forbidden = <T = string>(
    body: T = 'Forbidden' as unknown as T,
    headers?: HeadersInit
) => createResponse(403, body, headers);

/**
 * 404 Not Found
 */
export const notFound = <T = string>(
    body: T = 'Not Found' as unknown as T,
    headers?: HeadersInit
) => createResponse(404, body, headers);

/**
 * 405 Method Not Allowed
 */
export const methodNotAllowed = <T = string>(
    body: T = 'Method Not Allowed' as unknown as T,
    headers?: HeadersInit
) => createResponse(405, body, headers);

/**
 * 429 Too Many Requests
 */
export const tooManyRequests = <T = string>(
    body: T = 'Too Many Requests' as unknown as T,
    headers?: HeadersInit
) => createResponse(429, body, headers);

/**
 * 500 Internal Server Error
 */
export const internalError = (
    err: unknown,
    headers?: HeadersInit
): ResultResponse<string> =>
    createResponse(
        500,
        err instanceof Error ? err.message : String(err),
        headers
    );

/**
 * Sends a binary or stream-based file response with optional content-disposition.
 *
 * @param content - The file data (Blob, ArrayBuffer, or stream)
 * @param contentType - MIME type of the file
 * @param fileName - Optional download filename
 * @param headers - Optional extra headers
 * @returns A ResultResponse for download-ready content
 */
export const fileResponse = (
    content: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
    contentType: string,
    fileName?: string,
    headers?: HeadersInit
): ResultResponse<BodyInit> => {
    const disposition = fileName
        ? {'Content-Disposition': `attachment; filename="${fileName}"`}
        : {};

    return {
        status: 200,
        body: content,
        headers: {
            'Content-Type': contentType,
            ...disposition,
            ...headers,
        },
    };
};

/**
 * Converts an internal `ResultResponse` into a native `Response` object
 * for use inside Astro API routes.
 *
 * Automatically applies `Content-Type: application/json` for object bodies.
 *
 * @param result - A ResultResponse returned from route handler
 * @returns A native Response
 */
export function toAstroResponse(result: ResultResponse | undefined): Response {
    if (!result) return new Response(null, {status: 204});

    const {status, body, headers} = result;

    if (body === undefined || body === null) {
        return new Response(null, {status, headers});
    }

    const isObject = typeof body === 'object' || Array.isArray(body);
    const finalHeaders: HeadersInit = {
        ...(headers ?? {}),
        ...(isObject ? {'Content-Type': 'application/json; charset=utf-8'} : {}),
    };

    return new Response(
        isObject ? JSON.stringify(body) : (body as BodyInit),
        {
            status,
            headers: finalHeaders,
        }
    );
}
