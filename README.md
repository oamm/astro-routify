# astro-routify

**A high-performance API router for [Astro](https://astro.build/) built on a Trie matcher.**  
Define API routes using clean, flat structures — no folders or boilerplate logic.

![npm](https://img.shields.io/npm/v/astro-routify)
![license](https://img.shields.io/npm/l/astro-routify)
![downloads](https://img.shields.io/npm/dt/astro-routify)
![feedback-welcome](https://img.shields.io/badge/feedback-welcome-blue)

---

## Installing

```shell
npm install astro-routify
```

## 📋 Contents
- [Installing](#installing)
- [Quickstart](#quickstart)
- [Mental Model](#mental-model)
- [Which API should I use?](#which-api-should-i-use)
- [Core Concepts](#core-concepts)
- [Advanced Matching](#advanced-matching)
- [Middleware & Security](#middleware--security)
- [Single-entry Routing](#single-entry-routing)
- [Auto-Discovery & Scaling](#auto-discovery--scaling)
- [Advanced Features](#advanced-features)
- [Response Helpers](#response-helpers)
- [Performance](#performance)
- [Non-goals](#non-goals)

## ⚡️ Quickstart

```ts
// src/pages/api/index.ts
import {
    defineRoute,
    defineRouter,
    defineGroup,
    HttpMethod,
    ok,
} from 'astro-routify';

const userGroup = defineGroup('/users', (group) => {
    group.addGet('/:id', ({params}) => ok({id: params.id}));
});

export const GET = defineRouter([
    defineRoute(HttpMethod.GET, '/ping', () => ok('pong')),
    ...userGroup.getRoutes(),
]);
```

Or to handle everything in a single place:

```ts
import {RouterBuilder, ok} from 'astro-routify';

const builder = new RouterBuilder();

builder
    .addGet('/ping', () => ok('pong'))
    .addPost('/submit', async ({request}) => {
        const body = await request.json();
        return ok({received: body});
    });

export const ALL = builder.build(); // catch-all
```

## 🧠 Mental Model

`astro-routify` compiles your route definitions into a **Trie (prefix tree)** at startup.
At runtime, each request performs a deterministic path + method lookup and executes the matched handler inside Astro’s native API context.

```text
[Astro Endpoint]
       |
   astro-routify
       |
   Route Trie
       |
    Handler
```

> ⚡ **Cold-start performance**: Routes are compiled once at startup; there is no per-request route parsing. This makes it ideal for edge and serverless environments.

### Which API should I use?

| Use case | Recommended |
|----------|-------------|
| Small / explicit APIs | `defineRouter()` |
| Single-entry / catch-all | `RouterBuilder` |
| Vertical slices (glob) | `addModules()` |
| Large apps / plugins | Global registry |

## 💡 Full Example

You can find an implementation example in the [astro-routify-example](https://github.com/oamm/astro-routify-example)
repository.
It showcases a minimal Astro app with API endpoints configured under:

```text
/src/pages/api/[...path].ts
```

This setup demonstrates how to route requests dynamically using astro-routify, while still leveraging Astro's native
endpoint system.

---

## 🚀 Features

- ⚡ Fully compatible with Astro’s native APIContext — no extra setup needed.
- 🧩 Use middleware, access cookies, headers, and request bodies exactly as you would in a normal Astro endpoint.
- ✅ Flat-file, code-based routing (no folders required)
- ✅ Dynamic segments (`:id`)
- ✅ ALL-mode for single-entry routing (`RouterBuilder`)
- ✅ Built-in response helpers (`ok`, `created`, etc.)
- ✅ Trie-based matcher for fast route lookup
- ✅ Fully typed — no magic strings

> 🔄 See [CHANGELOG.md](./CHANGELOG.md) for recent updates and improvements.
---

## 🧠 Core Concepts

### `defineRoute()`

Declare a single route. Now supports middlewares and metadata. 

> 💡 `defineRoute` supports two signatures: you can pass a full `Route` object, or specify `method`, `path`, and `handler` as separate arguments.

```ts
defineRoute({
    method: 'GET',
    path: '/users/:id',
    middlewares: [authMiddleware],
    metadata: { summary: 'Get user by ID' },
    handler: ({params}) => ok({userId: params.id})
});
```

### `defineRouter()`

Group multiple routes under one HTTP method handler:

```ts
export const GET = defineRouter([
    defineRoute(HttpMethod.GET, "/health", () => ok("ok"))
]);
```

### Advanced Matching

`astro-routify` supports advanced routing patterns including wildcards and regex constraints.

#### 1. Wildcards
- `*` matches exactly one segment.
- `**` matches zero or more segments (catch-all).

```ts
builder.addGet('/files/*/download', () => ok('one segment'));
builder.addGet('/static/**', () => ok('all segments'));
```

#### 2. Regex Constraints
You can constrain parameters using regex by wrapping the pattern in parentheses: `:param(regex)`.

```ts
// Matches only numeric IDs
builder.addGet('/users/:id(\\d+)', ({ params }) => ok(params.id));

// Matches hex colors
builder.addGet('/color/:hex(^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$)', ({ params }) => ok(params.hex));
```

#### 3. Matching Priority
When multiple routes could match a path, the router follows a deterministic priority order:
1. **Static Match** (e.g., `/p/static`)
2. **Regex Match** (e.g., `/p/:id(\\d+)`)
3. **Param Match** (e.g., `/p/:id`)
4. **Wildcard Match** (e.g., `/p/*`)
5. **Catch-all Match** (e.g., `/**`)

### 🛡️ Middleware & Security

`astro-routify` provides a powerful middleware system and built-in security helpers.

#### 1. Middleware Support
Middleware can be applied globally, to groups, or to individual routes.

```ts
const builder = new RouterBuilder();

// Global middleware
builder.use(async (ctx, next) => {
    const start = performance.now();
    const res = await next();
    console.log(`Duration: ${performance.now() - start}ms`);
    return res;
});

// Group middleware
builder.group('/admin')
    .use(checkAuth)
    .addGet('/dashboard', (ctx) => ok('Admin only'));

// Route middleware
builder.addPost('/user', validate(UserSchema), (ctx) => {
    return ok(ctx.data.body);
});
```

#### 2. Request Validation
Built-in `validate()` middleware works with Zod, Valibot, or any library implementing a `safeParse` method.

```ts
import { validate } from 'astro-routify';
import { z } from 'zod';

const UserSchema = z.object({
    name: z.string(),
    email: z.string().email()
});

builder.addPost('/register', validate({ body: UserSchema }), (ctx) => {
    const user = ctx.data.body; // Fully typed if using TypeScript correctly
    return ok(user);
});
```

#### 3. Security Middlewares (CORS & Headers)
Protect your API with `cors()` and `securityHeaders()`.

```ts
import { cors, securityHeaders } from 'astro-routify';

builder.use(cors({ origin: 'https://example.com' }));
builder.use(securityHeaders());
```

### Centralized Error Handling
Handle all API errors in one place:

```ts
export const ALL = createRouter({
    onError: (err, ctx) => {
        console.error(err);
        return json({ error: 'Something went wrong' }, 500);
    }
});
```

> 🧠 `defineRouter()` supports all HTTP methods — but Astro only executes the method you export (`GET`, `POST`, etc.)

## 🧱 Single-entry Routing

Use `RouterBuilder` when you want to build routes dynamically, catch-all HTTP methods via `ALL`, or organize routes more
fluently with helpers.

```ts
const builder = new RouterBuilder();

builder
    .addGet("/ping", () => ok("pong"))
    .addPost("/submit", async ({request}) => {
        const body = await request.json();
        return ok({received: body});
    });

export const ALL = builder.build();
```

## 📂 Auto-Discovery & Scaling

To avoid a long list of manual registrations, you can use `addModules` combined with Vite's `import.meta.glob`. This allows
you to define routes anywhere in your project (near your components) and have them automatically registered.

> 💡 When passing the glob result directly to the router, you **don't** need to set `autoRegister: true` in your routes. The router will automatically discover all exported routes from the modules.

```ts
// src/pages/api/[...all].ts
import { RouterBuilder, createRouter } from 'astro-routify';

// 1. Using the builder
const builder = new RouterBuilder();
builder.addModules(import.meta.glob('../../**/*.routes.ts', { eager: true }));
export const ALL = builder.build();

// 2. Or using the one-liner helper
export const ALL = createRouter(
    import.meta.glob('../../**/*.routes.ts', { eager: true }),
    { debug: true } // optional: enable match logging
);
```

### 🛡️ Agnostic Auto-Registration (Global Registry)

If you want to avoid passing glob results or knowing the relative path to your routes, you can use the **global registry**. By setting the `autoRegister` flag or using **decorators**, routes will register themselves as soon as their module is loaded.

##### 1. Enable Auto-Registration in your routes

```ts
// src/components/User/User.routes.ts
import { defineRoute, defineGroup, ok, Get } from 'astro-routify';

// Option A: Using the flag
export const GET_USER = defineRoute('GET', '/users/:id', ({params}) => ok({id: params.id}), true);

// Option B: Using a group flag
defineGroup('/admin', (g) => {
    g.addGet('/stats', () => ok({}));
}, true);

// Option C: Using Decorators (requires experimentalDecorators: true)
class UserRoutes {
    @Get('/profile')
    static getProfile() { return ok({ name: 'Alex' }); }
}
```

##### 2. Initialize the router agnostically

In your catch-all endpoint (e.g., `src/pages/api/[...slug].ts`), you need to trigger the loading of your route files.

> **Why is the glob needed?**
> Even with auto-registration, Vite only executes files that are explicitly imported. The `import.meta.glob` call below tells Vite to find and execute your route files so they can register themselves in the global registry. Without this, the registry would remain empty.

###### Using `createRouter()` (Recommended)

The `createRouter` helper is the easiest way to get started. It automatically picks up everything from the global registry.

```ts
// src/pages/api/[...slug].ts
import { createRouter } from 'astro-routify';

// 1. Trigger loading of all route files.
// We don't need to pass the result to createRouter, but we must call it.
import.meta.glob('/src/**/*.routes.ts', { eager: true });

// 2. createRouter() will automatically pick up everything.
export const ALL = createRouter({ 
    debug: true,
    basePath: '/api' 
});
```

###### Using `RouterBuilder`

If you need more control, you can use `RouterBuilder` manually. You must explicitly call `.addRegistered()` to pull in routes from the global registry.

```ts
// src/pages/api/[...slug].ts
import { RouterBuilder, notFound, internalError } from 'astro-routify';

// 1. Load your routes
// This triggers Vite to execute the files and populate the global registry.
import.meta.glob('/src/**/*.routes.ts', { eager: true });

// 2. Construct the builder with optional configuration
const builder = new RouterBuilder({ 
    basePath: '/api',
    debug: true, // Enable logging
    onNotFound: () => notFound('Custom 404'),
    onError: (err) => internalError(err)
});

// 3. Add auto-registered routes and build
export const ALL = builder
    .addRegistered()
    .build();
```

> 💡 **The Catch-All Slug**: The filename `[...slug].ts` tells Astro to match any path under that directory. For example, if placed in `src/pages/api/[...slug].ts`, it matches `/api/users`, `/api/ping`, etc. `astro-routify` then takes over and matches the rest of the path against your defined routes.

You can also still manually add routes or groups:

```ts
const users = defineGroup("/users")
    .addGet("/:id", ({params}) => ok({id: params.id}));

builder.addGroup(users);
builder.addGet("/ping", () => ok("pong"));
```

## ⚡ Advanced Features

### 🔄 Streaming responses

#### Raw stream (e.g., Server-Sent Events)

```ts
stream('/clock', async ({response}) => {
    const timer = setInterval(() => {
        response.write(new Date().toISOString());
    }, 1000);

    setTimeout(() => {
        clearInterval(timer);
        response.close();
    }, 5000);
});

```

#### JSON NDStream (newline-delimited)

```ts

streamJsonND('/updates', async ({response}) => {
    response.send({step: 1});
    await delay(500);
    response.send({step: 2});
    response.close();
});

```

#### JSON Array stream

```ts

streamJsonArray('/items', async ({response}) => {
    for (let i = 0; i < 3; i++) {
        response.send({id: i});
    }
    response.close();
});

```

### 📖 OpenAPI (Swagger) Generation

Automatically generate API documentation:

```ts
import { generateOpenAPI } from 'astro-routify';

const router = builder.build();
const spec = generateOpenAPI(router, {
    title: 'My API',
    version: '1.0.0'
});

// Serve the spec
builder.addGet('/openapi.json', () => ok(spec));
```

> 🔁 While `.register()` is still available, it's **deprecated** in favor of `.addGroup()` and `.addRoute()` for better
> structure and reusability.

Your route files can export single routes, groups, or arrays:

```ts
// src/components/User/UserList.routes.ts
import { defineRoute, defineGroup, ok } from 'astro-routify';

export const GET = defineRoute('GET', '/users', () => ok([]));

export const AdminRoutes = defineGroup('/admin')
    .addPost('/reset', () => ok('done'));
```

#### 🛠 Development & Debugging

`astro-routify` provides built-in logging to help you see your route table during development.

- **Auto-logging**: In development mode (`NODE_ENV=development`), `RouterBuilder` automatically prints the registered routes to the console when `build()` is called.
- **Match Tracing**: Set `debug: true` in `RouterOptions` to see a log of every incoming request and which route it matched (or why it failed with 404/405).

```ts
const router = new RouterBuilder({ debug: true });
```

---

## 🔁 Response Helpers

Avoid boilerplate `new Response(JSON.stringify(...))`:

```ts
import {fileResponse} from 'astro-routify';

ok(data);                   // 200 OK
created(data);              // 201 Created
noContent();                // 204
notFound("Missing");        // 404
internalError(err);         // 500
```

### 📄 File downloads

```ts
fileResponse(content, "application/pdf", "report.pdf"); // sets Content-Type and Content-Disposition
```

---

---

## 🔍 Param Matching

Any route param like `:id` is extracted into `ctx.params`:

```ts
const builder = new RouterBuilder();

builder.addGet("/users/:id", ({params}) => ok({userId: params.id}));


//OR

defineRoute(HttpMethod.GET, "/items/:id", ({params}) => {
    return ok({itemId: params.id});
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
// src/pages/api/[...slug].ts

const builder = new RouterBuilder();
builder.addGet("/ping", () => ok({pong: true}));
builder.addGet("/users/:id", ({params}) => ok({userId: params.id}));

// OR

export const ALL = defineRouter([
    defineRoute(HttpMethod.GET, "/ping", () => ok({pong: true})),
    defineRoute(HttpMethod.GET, "/users/:id", ({params}) => ok({id: params.id}))
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

## 🎯 Non-goals

- **Not a replacement for Astro pages**: Use it for APIs, not for HTML rendering.
- **No runtime file watching**: Route discovery happens at startup.
- **No opinionated auth or ORM layer**: It's a router, not a framework.
- **No framework lock-in**: Works with any library (Zod, Valibot, etc.).

---

## 🛠 Designed to Scale

While focused on simplicity and speed today, `astro-routify` is designed to evolve — enabling more advanced routing
patterns in the future.

---

## 📜 License

MIT — © 2025 [Alex Mora](https://github.com/oamm)

---

## ☕ Support

If this project helps you, consider [buying me a coffee](https://coff.ee/alex_mora). Every drop keeps the code flowing!
