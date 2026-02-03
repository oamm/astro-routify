# Upgrade to v1.3.0

This guide highlights the new advanced routing features introduced in **astro-routify v1.3.0**. These changes are fully backward compatible.

## ✅ What’s New

- **Wildcard Support**: 
    - Use `*` to match exactly one segment.
    - Use `**` to match zero or more segments (catch-all).
- **Regex Constraints**: Use `:param(regex)` to add validation constraints directly to your route definitions.
- **Deterministic Priority**: A clear matching order ensures that the most specific route always wins.

## 🌟 New Features

### 1. Wildcards

Wildcards allow you to match dynamic paths without naming every segment.

```ts
// Matches /files/photo/download, /files/video/download, etc.
builder.addGet('/files/*/download', () => ok('one segment'));

// Matches /static, /static/css/main.css, /static/js/vendor/jquery.js, etc.
builder.addGet('/static/**', () => ok('catch-all'));
```

### 2. Regex Constraints

You can now use regular expressions to constrain what a parameter matches. This is perfect for numeric IDs, slugs, or specific formats.

```ts
// Only matches if 'id' is numeric
builder.addGet('/users/:id(\\d+)', ({ params }) => ok(`User ID: ${params.id}`));

// Matches hex color codes (e.g., /color/ff0000 or /color/fff)
builder.addGet('/color/:hex(^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$)', ({ params }) => ok(params.hex));
```

> **Note**: Remember to escape backslashes in your regex strings (e.g., `\\d` instead of `\d`).

### 3. Priority Order

If multiple routes match the same path, `astro-routify` uses the following priority:

1. **Static** (`/a/b`)
2. **Regex** (`/a/:id(\\d+)`)
3. **Param** (`/a/:id`)
4. **Wildcard** (`/a/*`)
5. **Catch-all** (`/a/**`)

## 🧪 Testing Notes

- New tests in `tests/AdvancedRouting.test.ts` cover these features and their combinations.
- All existing tests pass, ensuring no regressions in standard routing logic.

## ℹ️ Tips

- **Catch-all (`**`)** is great for proxying or serving static-like content from a single handler.
- **Regex** helps move validation logic out of your handlers and into the router, keeping your code cleaner.

For a complete list of changes, see **[CHANGELOG.md](./CHANGELOG.md)**.
