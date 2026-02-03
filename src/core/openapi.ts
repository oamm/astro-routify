import { type Route } from './defineRoute';
import { type RouterOptions } from './defineRouter';

/**
 * Basic options for OpenAPI generation.
 */
export interface OpenAPIOptions {
    title: string;
    version: string;
    description?: string;
    basePath?: string;
}

/**
 * Generates an OpenAPI 3.0.0 specification from a list of Routify routes.
 * 
 * @param router - The router handler function (returned by builder.build() or createRouter())
 * @param options - Basic info for the OpenAPI spec
 * @returns A JSON object representing the OpenAPI specification
 */
export function generateOpenAPI(router: any, options: OpenAPIOptions) {
    const routes: Route[] = router.routes || [];
    const routerOptions: RouterOptions = router.options || {};
    
    const basePath = options.basePath ?? routerOptions.basePath ?? '/api';
    
    const spec: any = {
        openapi: '3.0.0',
        info: {
            title: options.title,
            version: options.version,
            description: options.description
        },
        servers: [
            { url: basePath }
        ],
        paths: {}
    };

    for (const route of routes) {
        const path = route.path;
        // OpenAPI paths must start with / and should not include the basePath if it's in servers
        // Convert :param or :param(regex) to {param}
        const openApiPath = path.replace(/:([a-zA-Z0-9_]+)(\(.*?\))?/g, '{$1}');
        
        if (!spec.paths[openApiPath]) spec.paths[openApiPath] = {};
        
        const method = route.method.toLowerCase();
        const metadata = (route as any).metadata || {};
        
        spec.paths[openApiPath][method] = {
            summary: metadata.summary || `${route.method} ${path}`,
            description: metadata.description,
            tags: metadata.tags,
            parameters: [],
            responses: {
                '200': {
                    description: 'Successful response'
                }
            }
        };

        // Extract path parameters
        const pathParamMatches = path.matchAll(/:([a-zA-Z0-9_]+)/g);
        for (const match of pathParamMatches) {
            const name = match[1];
            spec.paths[openApiPath][method].parameters.push({
                name,
                in: 'path',
                required: true,
                schema: { type: 'string' }
            });
        }
    }

    return spec;
}
