export enum HttpMethod {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
	PATCH = 'PATCH',
	OPTIONS = 'OPTIONS',
}

export const ALLOWED_HTTP_METHODS = new Set<string>(Object.values(HttpMethod));

/**
 * Normalises an incoming method string and throws if it is unsupported.
 */
export function normalizeMethod(method: string): HttpMethod {
	const upper = method.toUpperCase();
	if (!ALLOWED_HTTP_METHODS.has(upper)) {
		throw new Error(`Unsupported HTTP method: ${method}`);
	}
	return upper as HttpMethod;
}
