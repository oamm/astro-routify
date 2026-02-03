import { describe, it, expect } from 'vitest';
import { RouterBuilder, ok, generateOpenAPI } from '../src';

describe('OpenAPI Generation', () => {
    it('should generate valid OpenAPI 3.0 spec with correct path formatting', () => {
        const builder = new RouterBuilder();
        builder.addGet('/users/:id', () => ok('ok'), { summary: 'Get User' });
        builder.addPost('/login', () => ok('ok'));
        builder.addGet('/posts/:postId/comments/:commentId', () => ok('ok'));
        
        const router = builder.build();
        const spec = generateOpenAPI(router, { title: 'Test API', version: '1.4.0' });
        
        expect(spec.openapi).toBe('3.0.0');
        expect(spec.info.title).toBe('Test API');
        
        // Path conversion :id -> {id}
        expect(spec.paths['/users/{id}']).toBeDefined();
        expect(spec.paths['/users/{id}'].get.summary).toBe('Get User');
        expect(spec.paths['/users/{id}'].get.parameters).toHaveLength(1);
        expect(spec.paths['/users/{id}'].get.parameters[0].name).toBe('id');
        
        expect(spec.paths['/login']).toBeDefined();
        expect(spec.paths['/login'].post).toBeDefined();

        expect(spec.paths['/posts/{postId}/comments/{commentId}']).toBeDefined();
        expect(spec.paths['/posts/{postId}/comments/{commentId}'].get.parameters).toHaveLength(2);
    });

    it('should handle regex parameters in OpenAPI paths', () => {
        const builder = new RouterBuilder();
        builder.addGet('/users/:id(\\d+)', () => ok('ok'));
        
        const router = builder.build();
        const spec = generateOpenAPI(router, { title: 'Regex API', version: '1.0.0' });
        
        // Should strip regex from path key but keep param name
        expect(spec.paths['/users/{id}']).toBeDefined();
        expect(spec.paths['/users/{id}'].get.parameters[0].name).toBe('id');
    });
});
