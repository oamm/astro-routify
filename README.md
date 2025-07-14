# astro-routify

**A high-performance API router for [Astro](https://astro.build/) built on a Trie matcher.**  
Define API routes using clean, flat structures — no folders or boilerplate logic.

![npm](https://img.shields.io/npm/v/astro-routify)
![license](https://img.shields.io/npm/l/astro-routify)
![downloads](https://img.shields.io/npm/dt/astro-routify)

---

## Installing

```shell
$ npm install astro-routify
```

## ⚡️ Quickstart

```ts
// src/pages/api/index.ts
import { defineRoute, defineRouter, HttpMethod, ok } from "astro-routify";

export const GET = defineRouter([
  defineRoute(HttpMethod.GET, "/ping", () => ok("pong")),
  defineRoute(HttpMethod.GET, "/users/:id", ({ params }) => ok({ id: params.id }))
]);
```

Or to handle everything in a single place:

```ts
import { RouterBuilder, defineRoute, HttpMethod, ok } from "astro-routify";

const builder = new RouterBuilder();
builder.register([
  defineRoute(HttpMethod.GET, "/ping", () => ok("pong")),
  defineRoute(HttpMethod.POST, "/submit", async ({ request }) => {
    const body = await request.json();
    return ok({ received: body });
  })
]);

export const ALL = builder.build(); // catch-all
```

---

## 🚀 Features

- ⚡ Fully compatible with Astro’s native APIContext — no extra setup needed.
- 🧩 Use middleware, access cookies, headers, and request bodies exactly as you would in a normal Astro endpoints.

- ✅ Flat-file, code-based routing (no folders required)
- ✅ Dynamic segments (`:id`)
- ✅ ALL-mode for monolithic routing (`RouterBuilder`)
- ✅ Built-in response helpers (`ok`, `created`, etc.)
- ✅ Trie-based matcher for fast route lookup
- ✅ Fully typed — no magic strings

---

## 🧠 Core Concepts

### `defineRoute()`

Declare a single route:

```ts
defineRoute(HttpMethod.GET, "/users/:id", ({ params }) => {
  return ok({ userId: params.id });
});
```

### `defineRouter()`

Group multiple routes under one HTTP method handler:

```ts
export const GET = defineRouter([
  defineRoute(HttpMethod.GET, "/health", () => ok("ok"))
]);
```

> 🧠 `defineRouter()` supports all HTTP methods — but Astro only executes the method you export (`GET`, `POST`, etc.)

### `RouterBuilder` (Catch-All)

Designed specifically for `ALL`:

```ts
const builder = new RouterBuilder();
builder.register([
  defineRoute(HttpMethod.GET, "/info", () => ok({ app: "astro-routify" }))
]);
export const ALL = builder.build();
```

---

## 🔁 Response Helpers

Avoid boilerplate `new Response(JSON.stringify(...))`:

```ts
ok(data);                // 200 OK
created(data);           // 201 Created
noContent();             // 204
notFound("Missing");     // 404
internalError(err);      // 500
```

---

## 🔍 Param Matching

Any route param like `:id` is extracted into `ctx.params`:

```ts
defineRoute(HttpMethod.GET, "/items/:id", ({ params }) => {
  return ok({ itemId: params.id });
});
```

---

## 🤯 Why Use astro-routify?

### ❌ Without it

```ts
// src/pages/api/[...slug].ts
export const GET = async ({request}) => {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/users/')) {
        // Try to extract ID
        const id = path.split('/').pop();
        return new Response(JSON.stringify({id}), {
            status: 200,
            headers: {'Content-Type': 'application/json'},
        });
    }

    if (path === '/api/users') {
        return new Response(JSON.stringify([{id: 1}, {id: 2}]), {
            status: 200,
            headers: {'Content-Type': 'application/json'},
        });
    }


    if (path === '/api/ping') {
        return new Response(JSON.stringify({pong: true}), {
            status: 200,
            headers: {'Content-Type': 'application/json'}
        });
    }


    return new Response('Not Found', {status: 404});
};
```

### 📁 And then there's folder hell...

```
src/
├─ pages/
│  ├─ api/
│  │  ├─ users/
│  │  │  ├─ index.ts       // GET all users
│  │  │  ├─ [id]/
│  │  │  │  ├─ index.ts    // GET / POST / DELETE for a user
│  │  ├─ ping.ts
```

### ✅ With `astro-routify`

```ts
//src/pages/api/[...slug].ts
export const ALL = defineRouter([
  defineRoute(HttpMethod.GET, "/ping", () => ok({ pong: true })),
  defineRoute(HttpMethod.GET, "/users/:id", ({ params }) => ok({ id: params.id }))
]);
```

---

## 📈 Performance

`astro-routify` uses a Trie structure for fast route and method matching.  
It’s optimized for real-world route hierarchies, and avoids nested `if` chains.

## 🧪 Benchmarks

Realistic and synthetic benchmarks using `vitest bench`.

### 🖥 Benchmark Machine

Tests ran on a mid-range development setup:

- **CPU**: Intel Core i5-7600K @ 3.80GHz (4 cores)
- **RAM**: 16 GB DDR4
- **GPU**: NVIDIA GeForce GTX 1080 (8 GB)
- **OS**: Windows 10 Pro 64-bit
- **Node.js**: v20.x
- **Benchmark Tool**: [Vitest Bench](https://vitest.dev/guide/features.html#benchmarking)

Results may vary slightly on different hardware.


### 🔬 Realistic route shapes (5000 registered routes):

```
✓ RouteTrie performance - realistic route shapes

 · Static route lookup (5000)                         1,819,681 req/sec
 · Param route: /users/:userId                        1,708,264 req/sec
 · Nested param route: /users/:id/orders/:oid         1,326,324 req/sec
 · Blog route: /blog/:year/:month/:slug               1,220,882 req/sec
 · Nonexistent path                                   1,621,934 req/sec
```

### 📈 Route scaling test:

```
✓ RouteTrie performance

 · Lookup in SMALL (100 routes)                       1,948,385 req/sec
 · Lookup in MEDIUM (1000 routes)                     1,877,248 req/sec
 · Lookup in LARGE (10000 routes)                     1,908,279 req/sec
 · Lookup non-existent route in LARGE                 1,962,051 req/sec
```

> ⚡ Performance stays consistently fast even with 10k+ routes
---

## 🛠 Designed to Scale

While focused on simplicity and speed today, `astro-routify` is designed to evolve — enabling more advanced routing patterns in the future.

---

## 📜 License

MIT — © 2025 [Alex Mora](https://github.com/oamm)

---

## ☕ Support

If this project helps you, consider [buying me a coffee](https://coff.ee/alex_mora). Every drop keeps the code flowing!
