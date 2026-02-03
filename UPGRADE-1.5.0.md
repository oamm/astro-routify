# Upgrade to v1.5.0

This release includes breaking changes to the context API and significant improvements to routing and response handling.

## ⚠️ Breaking Changes

### 1. Context Renaming: `data` → `state`
The `ctx.data` property has been renamed to `ctx.state`. This change aligns `astro-routify` with other popular middleware-based routers like Koa and Hono.

**Before:**
```ts
builder.use(async (ctx, next) => {
    ctx.data.user = { id: 1 };
    return next();
});
```

**After:**
```ts
builder.use(async (ctx, next) => {
    ctx.state.user = { id: 1 };
    return next();
});
```

### 2. SSE Prefix Change
The `stream()` helper now uses `state: ` as the default prefix for string chunks when in `text/event-stream` mode.

**Before:**
Hand-rolled SSE might have used `data: `.

**After:**
Strings passed to `response.write()` are automatically prefixed with `state: ` and suffixed with `\n\n`.
If you need the standard `data: ` prefix or raw output, you can override the `Content-Type` or use a custom writer.

### 3. Catch-all `**` Restriction
The `**` wildcard is now only allowed as the **final segment** of a path. Validating your routes during development will catch this.

## 🚀 What’s New

### 1. Non-lossy Query Parsing
`ctx.query` now preserves multiple values for the same key by returning an array. It also provides `ctx.searchParams` for raw access.

```ts
// URL: /api/search?tag=astro&tag=routing
ctx.query.tag; // ['astro', 'routing']
ctx.searchParams.get('tag'); // 'astro'
```

### 2. Enhanced Response Types
You can now return `Blob`, `FormData`, `URLSearchParams`, and `Uint8Array` directly from your handlers. They will be converted to native Astro Responses with appropriate headers.

### 3. Deterministic Matching
Regex and parameter matching are now deterministic, even when multiple routes share the same path structure.

### 4. Catch-all Capture
The `**` wildcard now captures the rest of the path into `ctx.params['*']`.

```ts
// Route: /static/**
// URL: /static/images/logo.png
ctx.params['*']; // "images/logo.png"
```
