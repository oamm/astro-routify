# Changelog

All notable changes to **astro-routify** will be documented in this file.

---

## [1.7.3] - 2026-08-05

### Added
- Automatic `OPTIONS` fallback routes so `cors()` handles preflight requests without explicit `OPTIONS` routes.

### Fixed
- Credentialed CORS no longer reflects arbitrary origins and now supports correct `Vary: Origin` behavior.
- Unsupported request methods return `405 Method Not Allowed` instead of `500 Internal Server Error`.
- Default error responses no longer expose exception messages to clients.
- Per-request logging is disabled unless router debugging is enabled.

### Performance
- Reduced allocations during trie parameter matching.
- Kept generated preflight routes internal so route metadata and OpenAPI output remain unchanged.

### Tests
- Added coverage for CORS origin restrictions, preflight handling, unsupported methods, and default error redaction.

---

## [1.7.2] - 2026-06-28

### Changed
- Expanded the Astro peer dependency range to include Astro 6 and Astro 7.
- Upgraded the package test toolchain to Astro 7.0.3, Rollup 4.62.2, TypeScript 6.0.3, Undici 8.5.0, and Vitest 4.1.9.

### Compatibility
- Tested the current public type surface and routing behavior against Astro 7.0.3.

---

## [1.7.1] - 2026-05-16

### Fixed
- **HMR route stability**: `addRegistered()` now deduplicates by `method:path` after flattening groups, preventing route loss when multiple auto-registered groups share the same `basePath`.
- **Lazy init race**: first-request lazy module initialization is now concurrency-safe and runs once, avoiding duplicate module resolution/registration under concurrent requests.
- **Dev-session memory growth**: global registry now compacts itself with bounded retention (default max: `1000` items), keeping only last-wins route versions.

### Changed
- **Sharper route keying**: centralized internal route-key generation to reduce drift across duplicate detection and compaction paths.
- **Quieter default dev logs**: per-registration logs are now gated by `ASTRO_ROUTIFY_DEBUG_REGISTRATION=1`.

### Added
- `ASTRO_ROUTIFY_REGISTRY_MAX_ITEMS` environment variable to tune registry retention during long HMR sessions.
- Regression coverage for shared-basePath HMR updates, concurrent lazy initialization, and long-session endurance with mixed registration.

---


## [1.7.0] – 2026-02-08

### ✨ Added
- **Astro Integration (`routify`)**: 
    - New `routify()` integration for "zero-config" setup in `astro.config.mjs`.
    - Automatically discovers route files matching `**/*.{route,routes}.ts` (configurable).
    - Injects auto-registration imports into any file calling `createRouter()`.
- **Lazy Module Support**:
    - `RouterBuilder.addModules()` and `createRouter()` now support non-eager `import.meta.glob()`.
    - Modules are resolved asynchronously upon the first request, improving initial build/dev start times.
- **Robust Global Registry**:
    - Switched to `Symbol.for('astro-routify.registry')` for the internal registry.
    - Prevents registration loss when multiple versions of the library are loaded (e.g., in complex pnpm/monorepo setups).

### 🛠 Changed
- **Improved Diagnostics**:
    - Standardized logging prefix `[astro-routify]` across the library.
    - Color-coded matching logs in debug mode (Green: matched, Yellow: 405, Red: 404).
    - Automatic `basePath` logging when the router starts.
- **Standardized Defaults**:
    - `RouterBuilder` and `createRouter` now default to `/api` for `basePath` if not specified.

---

## [1.5.0] – 2026-02-03

### ⚠️ Breaking Changes
- **Context Renaming**: `ctx.data` has been renamed to `ctx.state` to better align with industry standards (like Koa/Hono).
- **SSE Prefix**: The default prefix for `stream()` text chunks in `text/event-stream` mode is now `state: ` (matching internal project conventions). *Note: Use `setContentType()` if you need standard `data: ` prefix or raw output.*

### ✨ Added
- **Non-lossy Query Parsing**: 
    - `ctx.query` now supports multi-value keys: `Record<string, string | string[]>`.
    - `ctx.searchParams` added to provide the raw `URLSearchParams` object.
- **Enhanced Response Support**:
    - `toAstroResponse` now natively handles `Blob`, `FormData`, `URLSearchParams`, `Uint8Array`, and `ReadableStream`.
    - `null` now returns `200 OK` with JSON `null` instead of `204 No Content`.
    - `undefined` still returns `204 No Content`.
    - Primitives (numbers, booleans) now return `application/json` by default.
- **Improved Routing Determinism**:
    - Route matching is now fully deterministic even with overlapping regex or dynamic parameters.
    - Catch-all `**` now captures the remainder of the path into `ctx.params['*']` (URL-decoded, no leading slash).
- **HMR & Module Discovery**:
    - Improved reliability of `addModules()` and `addRegistered()` using internal markers instead of constructor names.
    - Explicit "last-registration-wins" policy for the global registry to support better HMR.

### 🛠 Changed
- **Catch-all Restriction**: The `**` wildcard is now only allowed as the final segment of a path.
- **SSE Auto-formatting**: `stream()` now automatically wraps string writes with a prefix and double-newlines when in SSE mode.

## [1.4.0] – 2026-02-02

### ✨ Added
- **Middleware Support**:
    - Global, group-level, and route-level middleware.
    - Support for `next()` to continue or short-circuit requests.
    - `RouterBuilder.use()` and `RouteGroup.use()`.
- **Request Validation**:
    - `validate()` middleware compatible with Zod and other schema libraries.
    - Automatic JSON body parsing and validation.
- **Security Middlewares**:
    - `cors()` middleware for handling Cross-Origin Resource Sharing.
    - `securityHeaders()` middleware for essential security headers (Helmet-like).
- **Enhanced Context**:
    - `ctx.query`: Parsed query parameters.
    - `ctx.data`: Shared data container for middlewares and handlers.
- **Centralized Error Handling**:
    - `onError` hook in `RouterOptions`.
- **Automatic OpenAPI Generation**:
    - `generateOpenAPI()` utility to generate Swagger/OpenAPI 3.0 specs.
- **Improved Response Helpers**:
    - `json()` helper for returning JSON with custom status codes.

### 🛠 Changed
- `RouterBuilder` and `RouteGroup` methods now support multiple arguments for middlewares.
- `defineRouter` now automatically wraps handlers with `defineHandler` for consistent logging.

## [1.3.0] – 2026-02-02

### ✨ Added
- **Advanced Routing Matcher**:
    - Support for single-segment wildcard `*`.
    - Support for catch-all wildcard `**` (matches zero or more segments).
    - Support for regex-constrained parameters `:name(<regex>)`.
- **Priority Matching**: Deterministic resolution when multiple routes match (Static > Regex > Param > Wildcard > Catch-all).

### ✅ Tests
- New test suite `tests/AdvancedRouting.test.ts` covering all new matching patterns and priority rules.

## [1.2.1] – 2025-08-02

### 🛠 Changed

- **`StreamWriter.write(string)` now auto-formats SSE messages**:
  - When writing string values, `stream()` automatically wraps them as `data: ...\n\n`, per the [Server-Sent Events specification](https://html.spec.whatwg.org/multipage/server-sent-events.html#server-sent-events).
  - This makes it easier to send valid `EventSource` messages:
    ```ts
    response.write('hello'); // now sends: "state: hello\n\n"
    ```

### ✅ Behavior

- Binary chunks (`Uint8Array`) are passed through unchanged.
- Developers no longer need to manually format strings with `data:`.

## [1.2.0] - 2025-08-02

### ✨ Added

- `stream()` — Define raw streaming routes with full control over `Content-Type` and chunked output
- `streamJsonND()` — Send newline-delimited JSON (NDJSON) for real-time progressive responses
- `streamJsonArray()` — Stream large arrays incrementally with low memory overhead
- Automatic handling of abort signals and connection termination for streamed responses
- Internal streaming helpers (`StreamWriter`, `JsonStreamWriter`) provide ergonomic developer APIs

### ✅ Tests

- Integration tests for:
  - NDJSON response flow and formatting
  - JSON array streaming and finalization
  - Content-Type headers and chunk merging validation

## [1.1.0] - 2025-07-31

### ✨ Added

- `defineGroup()` — Enables grouping routes under a common prefix
- `RouterBuilder.addGroup()` — Fluent composition of grouped routes
- `RouterBuilder.addGet()`, `addPost()`, `addPut()`, etc. — Shorthand helpers for defining routes
- `fileResponse()` — New helper for returning downloadable files (PDFs, binary streams, etc.)
- `defineHandler()` now automatically detects and returns file responses
- Improved internal response flow — handles `Blob`, `ReadableStream`, and `ArrayBuffer` as native `Response`
- Expanded test coverage for dynamic route parameters with groups

### 🛠 Changed

- `RouterBuilder.register()` is **deprecated**
  - ✅ Use `defineGroup()` and `addGroup()` for cleaner structure and automatic path prefixing
- Improved warning message for legacy `register()` usage

### ✅ Tests

- Coverage for:
  - Group-based route building and mounting
  - Param extraction from grouped and nested paths
  - File response behavior (headers, blobs, and content handling)
  - Response Helpers API consistency (`ok`, `created`, `notFound`, etc.)

---

## [1.0.0] - 2025-07-17

Initial release 🎉

- Trie-based high-performance router for Astro
- `defineRoute()` / `defineRouter()` / `RouterBuilder`
- Built-in response helpers (`ok`, `created`, `notFound`, etc.)
- Full TypeScript support
- Dynamic param support (`:id`)
- ALL-catch mode support

---
