# Changelog

All notable changes to **astro-routify** will be documented in this file.

---

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
    response.write('hello'); // now sends: "data: hello\n\n"
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
