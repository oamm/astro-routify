import { type Middleware } from './defineHandler';
import { badRequest, toAstroResponse } from './responseHelpers';

/**
 * CORS options.
 */
export interface CorsOptions {
    origin?: string | string[] | ((origin: string) => boolean | string);
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}

/**
 * Middleware to enable Cross-Origin Resource Sharing (CORS).
 */
export function cors(options: CorsOptions = {}): Middleware {
    return async (ctx, next) => {
        const origin = ctx.request.headers.get('Origin');
        
        // Handle preflight
        if (ctx.request.method === 'OPTIONS') {
            const headers = new Headers();
            if (origin) {
                headers.set('Access-Control-Allow-Origin', origin);
            }
            if (options.methods) {
                headers.set('Access-Control-Allow-Methods', options.methods.join(','));
            } else {
                headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
            }
            if (options.allowedHeaders) {
                headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(','));
            } else {
                const requestedHeaders = ctx.request.headers.get('Access-Control-Request-Headers');
                if (requestedHeaders) headers.set('Access-Control-Allow-Headers', requestedHeaders);
            }
            if (options.credentials) {
                headers.set('Access-Control-Allow-Credentials', 'true');
            }
            if (options.maxAge) {
                headers.set('Access-Control-Max-Age', String(options.maxAge));
            }
            return new Response(null, { status: 204, headers });
        }

        const res = await next();
        const newHeaders = new Headers(res.headers);
        
        if (origin) {
            newHeaders.set('Access-Control-Allow-Origin', origin);
        } else {
            newHeaders.set('Access-Control-Allow-Origin', '*');
        }

        if (options.credentials) {
            newHeaders.set('Access-Control-Allow-Credentials', 'true');
        }

        if (options.exposedHeaders) {
            newHeaders.set('Access-Control-Expose-Headers', options.exposedHeaders.join(','));
        }

        return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: newHeaders
        });
    };
}

/**
 * Middleware to add common security headers (Helmet-like).
 */
export function securityHeaders(): Middleware {
    return async (ctx, next) => {
        const res = await next();
        const headers = new Headers(res.headers);

        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'SAMEORIGIN');
        headers.set('X-XSS-Protection', '1; mode=block');
        headers.set('Referrer-Policy', 'no-referrer-when-downgrade');
        headers.set('Content-Security-Policy', "default-src 'self'");

        return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers
        });
    };
}

/**
 * Interface for schemas compatible with Zod, Valibot, etc.
 */
export interface Validatable {
    safeParse: (data: any) => { success: true; data: any } | { success: false; error: any };
}

/**
 * Validation schema for request components.
 */
export interface ValidationSchema {
    body?: Validatable;
    query?: Validatable;
    params?: Validatable;
}

/**
 * Middleware for request validation.
 * Supports any schema library with a `safeParse` method (like Zod).
 * 
 * Validated state is stored in `ctx.state.body`, `ctx.state.query`, etc.
 */
export function validate(schema: ValidationSchema): Middleware {
    return async (ctx, next) => {
        if (schema.params) {
            const result = schema.params.safeParse(ctx.params);
            if (!result.success) return toAstroResponse(badRequest({ error: 'Invalid parameters', details: result.error }));
            ctx.state.params = result.data;
        }

        if (schema.query) {
            const result = schema.query.safeParse(ctx.query);
            if (!result.success) return toAstroResponse(badRequest({ error: 'Invalid query string', details: result.error }));
            ctx.state.query = result.data;
        }

        if (schema.body) {
            try {
                const body = await ctx.request.clone().json();
                const result = schema.body.safeParse(body);
                if (!result.success) return toAstroResponse(badRequest({ error: 'Invalid request body', details: result.error }));
                ctx.state.body = result.data;
            } catch (e) {
                return toAstroResponse(badRequest({ error: 'Invalid JSON body' }));
            }
        }

        return next();
    };
}
