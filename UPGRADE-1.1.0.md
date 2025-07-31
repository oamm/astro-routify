# Upgrade to v1.0.1

This guide highlights what changed in **astro-routify v1.0.1** and how to start using the new, more fluent APIs without breaking existing code.

## ✅ What’s New

- **Route Groups**: `defineGroup('/prefix')` to organize related routes under a common base path.
- **RouterBuilder helpers**: `addGet`, `addPost`, `addPut`, `addPatch`, `addDelete`, and `addRoute` for fluent composition.
- **File responses**: `fileResponse(content, contentType, fileName?)` to return downloadable files (e.g., PDFs, images, binary streams).
- **Consistent handler pipeline**: `defineHandler()` understands native `Response` and the helpers output via `toAstroResponse()`.

## 🗑 Deprecations (No Breaking Changes)

- `RouterBuilder.register()` is **deprecated**. It still works, but you’ll see a one-time warning.
  - Prefer **groups** (`defineGroup()` + `builder.addGroup(group)`) or **method helpers** (`addGet`, `addPost`, etc.).

## 🔁 Migrate Examples

### Before (v1.0.0)

```ts
import {RouterBuilder, defineRoute, HttpMethod, ok} from 'astro-routify';

const builder = new RouterBuilder();
builder.register([
  defineRoute(HttpMethod.GET, '/ping', () => ok('pong')),
  defineRoute(HttpMethod.POST, '/submit', async ({request}) => ok(await request.json()))
]);

export const ALL = builder.build();
```

### After (v1.1.0)

**Using fluent helpers**:

```ts
import {RouterBuilder, ok} from 'astro-routify';

const builder = new RouterBuilder();

builder
  .addGet('/ping', () => ok('pong'))
  .addPost('/submit', async ({request}) => {
    const body = await request.json();
    return ok(body);
  });

export const ALL = builder.build();
```

**Using groups**:

```ts
import {defineGroup, RouterBuilder, ok} from 'astro-routify';

const users = defineGroup('/users')
  .addGet('/:id', ({params}) => ok({id: params.id}));

const builder = new RouterBuilder().addGroup(users);

export const ALL = builder.build();
```

## 📄 File Downloads

```ts
import {defineRoute, defineRouter, HttpMethod, fileResponse} from 'astro-routify';

export const GET = defineRouter([
  defineRoute(HttpMethod.GET, '/download', () => {
    const blob = new Blob([Uint8Array.from([0x25,0x50,0x44,0x46])], { type: 'application/pdf' }); // "%PDF"
    return fileResponse(blob, 'application/pdf', 'demo.pdf');
  }),
]);
```

## 🧪 Testing Notes

- New tests cover:
  - Group-based routing and param extraction (`/group/:g/item/:id`)
  - File responses: headers (`Content-Type`, `Content-Disposition`) and binary body
  - Fluent helpers in `RouterBuilder`

## ℹ️ Tips

- **Base path** is still handled by `defineRouter({ basePath })` and stripped from the request URL. You **should not** prefix route paths with it.
- Groups compose paths internally (e.g., `defineGroup('/users').addGet('/:id', ...)` becomes `/users/:id`).

For a complete list of changes, see **[CHANGELOG.md](./CHANGELOG.md)**.
