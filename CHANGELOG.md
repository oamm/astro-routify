# Changelog

All notable changes to **astro-routify** will be documented in this file.

---

## [1.2.0] - 2025-08-02

### ✨ Added

- `stream()` — Define raw streaming routes with full control over `Content-Type` and chunked output
- `streamJsonND()` — Send newline-delimited JSON (NDJSON) for real-time progressive responses
- `streamJsonArray()` — Stream large arrays incrementally with low memory overhead
- Automatic handling of abort signals and connection termination for streamed responses
- Internal streaming helpers (`StreamWriter`, `JsonStreamWriter`) provide ergonomic developer APIs

### 🧪 Examples

- `/examples/clock` — Live event stream using `EventSource` (SSE)
- `/examples/ndjson` — Streaming JSON log entries one at a time
- `/examples/array` — Streaming full JSON arrays progressively

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
