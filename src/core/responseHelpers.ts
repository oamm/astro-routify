import {BodyInit, HeadersInit} from "undici";

export interface ResultResponse<T = unknown> {
    body?: T;
    status: number;
    headers?: HeadersInit;
}

function createResponse<T>(status: number, body?: T, headers?: HeadersInit): ResultResponse<T> {
    return {status, body, headers};
}

export const ok =
    <T>(body: T, headers?: HeadersInit) => createResponse(200, body, headers);
export const created =
    <T>(body: T, headers?: HeadersInit) => createResponse(201, body, headers);
export const noContent =
    (headers?: HeadersInit) => createResponse(204, undefined, headers);
export const notModified =
    (headers?: HeadersInit) => createResponse(304, undefined, headers);
export const badRequest =
    <T = string>(body: T = 'Bad Request' as unknown as T, headers?: HeadersInit) =>
        createResponse(400, body, headers);
export const unauthorized = <T = string>(
    body: T = 'Unauthorized' as unknown as T,
    headers?: HeadersInit
) => createResponse(401, body, headers);
export const forbidden = <T = string>(
    body: T = 'Forbidden' as unknown as T,
    headers?: HeadersInit
) => createResponse(403, body, headers);
export const notFound = <T = string>(
    body: T = 'Not Found' as unknown as T,
    headers?: HeadersInit
) => createResponse(404, body, headers);
export const methodNotAllowed = <T = string>(
    body: T = 'Method Not Allowed' as unknown as T,
    headers?: HeadersInit
) => createResponse(405, body, headers);
export const internalError = (err: unknown, headers?: HeadersInit): ResultResponse<string> =>
    createResponse(500, err instanceof Error ? err.message : String(err), headers);

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

    return new Response(isObject ? JSON.stringify(body) : (body as BodyInit), {
        status,
        headers: finalHeaders,
    });
}
