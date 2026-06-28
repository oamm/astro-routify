# Upgrade to v1.7.2

This release focuses on dependency maintenance and Astro 7 compatibility.

## Astro Compatibility

`astro-routify` now declares peer compatibility with Astro 4, 5, 6, and 7:

```json
"astro": "^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0"
```

The test and build toolchain has been updated to run against `astro@7.0.3`.

## Application Changes

No code changes are required for existing `astro-routify` users. The public API remains unchanged from v1.7.1.

## Recommended Check

After upgrading your Astro project, run your normal type-check, test, and build commands to catch any Astro application-level migration issues unrelated to `astro-routify`.
