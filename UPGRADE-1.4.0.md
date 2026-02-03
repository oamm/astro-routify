# Upgrade to v1.4.0

> ⚠️ **Note**: Starting from v1.5.0, `ctx.data` has been renamed to `ctx.state`.

This release introduces major features like Middleware, Validation, and enhanced Context.

## 🚀 What’s New

- **Middleware Support**: You can now use `.use(middleware)` on `RouterBuilder` and `RouteGroup`.
- **Enhanced Context**: `ctx.query` is now available, and `ctx.data` can be used to share data between middlewares.
- **Request Validation**: Built-in `validate()` helper for Zod-like schemas.
- **Security**: New `cors()` and `securityHeaders()` middlewares.
- **Error Handling**: Custom `onError` hook in router options.
- **OpenAPI**: `generateOpenAPI()` utility for documentation.

## ⚠️ Breaking Changes & Deprecations

None! v1.4.0 is fully backwards compatible. However, the internal signatures for `defineRouter` and `RouteTrie` have changed. If you were extending these classes, you might need to update your code.

## 🔁 Migration & Examples

### Using Middlewares

```ts
const builder = new RouterBuilder();

builder.use(async (ctx, next) => {
    console.log('Global Middleware');
    return next();
});

builder.addGet('/protected', authMiddleware, (ctx) => ok('Secret'));
```

### Using Validation

```ts
import { validate } from 'astro-routify';
import { z } from 'zod';

const schema = z.object({ id: z.string().uuid() });

builder.addGet('/user/:id', validate({ params: schema }), (ctx) => {
    return ok(ctx.data.params.id);
});
```

### Custom Error Handling

```ts
export const ALL = createRouter({
    onError: (err, ctx) => {
        return json({ error: 'Internal Error' }, 500);
    }
});
```

### OpenAPI Generation & Metadata

You can now generate OpenAPI 3.0 documentation and add metadata to your routes.

```ts
import { generateOpenAPI } from 'astro-routify';

// Add metadata (summary, description, tags) to routes
builder.addGet('/users', handler, { summary: 'List users', tags: ['Users'] });

const router = builder.build();
const spec = generateOpenAPI(router, { title: 'My API', version: '1.0.0' });
```
