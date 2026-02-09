# Upgrade to v1.7.0

This release introduces a new, recommended way to set up `astro-routify` using an Astro Integration, along with support for lazy-loaded route modules.

## 🚀 What’s New

### 1. Astro Integration (`routify`)

You no longer need to manually manage `import.meta.glob` in your API entry points. The new `routify()` integration handles route discovery and registration automatically.

**How to migrate:**

1.  Add the integration to `astro.config.mjs`:
    ```ts
    import { routify } from 'astro-routify';

    export default defineConfig({
      integrations: [routify()]
    });
    ```

2.  Simplify your API entry point (e.g., `src/pages/api/[...route].ts`):
    ```ts
    import { createRouter } from 'astro-routify';

    // No more manual globbing!
    export const ALL = createRouter({ debug: true });
    ```

### 2. Lazy Module Support

If you prefer manual globbing, you can now use lazy-loaded globs (the Vite default). This can improve development startup time in large projects.

**Before (v1.5.0):**
```ts
// Required eager: true
import.meta.glob('/src/**/*.route.ts', { eager: true });
export const ALL = createRouter();
```

**After (v1.7.0):**
```ts
// Supports lazy (default)
export const ALL = createRouter(import.meta.glob('/src/**/*.route.ts'));
```

### 3. Robust Global Registry

We've improved the internal registry to use a global Symbol. This ensures that auto-registration works even if your environment accidentally loads multiple copies of the `astro-routify` library (common in some monorepo or pnpm configurations).

## 🛠 Improvements

- **Standardized Logging**: All logs now use the `[astro-routify]` prefix.
- **Colorized Debugging**: Matching results (Matched/404/405) are now color-coded in the console for better visibility.
- **Default BasePath**: `createRouter` and `RouterBuilder` now default to `/api` if no `basePath` is provided.

## ⚠️ Breaking Changes

There are no breaking changes to the public API in this release. All v1.5.0 code remains compatible, though we recommend migrating to the Astro Integration for the best experience.
