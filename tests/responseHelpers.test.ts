import {
    ok,
    created,
    noContent,
    notModified,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    methodNotAllowed,
    internalError,
    fileResponse,
    toAstroResponse,
    isReadableStream
} from '../dist';
import {describe, it, expect} from 'vitest';

describe('Response Helpers', () => {
    it('should return a 200 OK response', async () => {
        const result = ok({message: 'success'});
        const response = toAstroResponse(result);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({message: 'success'});
    });

    it('should return a 201 Created response', async () => {
        const result = created({id: 123});
        const response = toAstroResponse(result);
        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({id: 123});
    });

    it('should return a 204 No Content response', async () => {
        const result = noContent();
        const response = toAstroResponse(result);
        expect(response.status).toBe(204);
        expect(await response.text()).toBe('');
    });

    it('should return a 304 Not Modified response', async () => {
        const result = notModified();
        const response = toAstroResponse(result);
        expect(response.status).toBe(304);
        expect(await response.text()).toBe('');
    });

    it('should return a 400 Bad Request response with default message', async () => {
        const result = badRequest();
        const response = toAstroResponse(result);
        expect(response.status).toBe(400);
        expect(await response.text()).toBe('Bad Request');
    });

    it('should return a 401 Unauthorized response', async () => {
        const result = unauthorized('Token expired');
        const response = toAstroResponse(result);
        expect(response.status).toBe(401);
        expect(await response.text()).toBe('Token expired');
    });

    it('should return a 403 Forbidden response', async () => {
        const result = forbidden();
        const response = toAstroResponse(result);
        expect(response.status).toBe(403);
        expect(await response.text()).toBe('Forbidden');
    });

    it('should return a 404 Not Found response', async () => {
        const result = notFound();
        const response = toAstroResponse(result);
        expect(response.status).toBe(404);
        expect(await response.text()).toBe('Not Found');
    });

    it('should return a 405 Method Not Allowed response', async () => {
        const result = methodNotAllowed();
        const response = toAstroResponse(result);
        expect(response.status).toBe(405);
        expect(await response.text()).toBe('Method Not Allowed');
    });

    it('should return a 500 Internal Server Error response', async () => {
        const result = internalError(new Error('Unexpected failure'));
        const response = toAstroResponse(result);
        expect(response.status).toBe(500);
        expect(await response.text()).toBe('Unexpected failure');
    });

    it('should return a file download response', async () => {
        const content = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], {type: 'application/pdf'});
        const result = fileResponse(content, 'application/pdf', 'test.pdf');

        const headers = result.headers as Record<string, string>;

        expect(result.status).toBe(200);
        expect(headers['Content-Type']).toBe('application/pdf');
        expect(headers['Content-Disposition']).toBe('attachment; filename="test.pdf"');
        expect(result.body).toBe(content);
    });

    describe('isReadableStream', () => {
        it('should return true for ReadableStream', () => {
            const stream = new ReadableStream();
            expect(isReadableStream(stream)).toBe(true);
        });

        it('should return false for other types', () => {
            expect(isReadableStream({})).toBe(false);
            expect(isReadableStream(null)).toBe(false);
            expect(isReadableStream(undefined)).toBe(false);
            expect(isReadableStream('string')).toBe(false);
            expect(isReadableStream(123)).toBe(false);
            expect(isReadableStream(new Blob())).toBe(false);
            expect(isReadableStream(new ArrayBuffer(0))).toBe(false);
        });

        it('should return true for objects that look like ReadableStream', () => {
            const mockStream = {
                getReader: () => {}
            };
            expect(isReadableStream(mockStream)).toBe(true);
        });
    });
});
