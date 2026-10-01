# Improve & Quality Rules — @wynn-dev/svelte-use

The `improve` mindset is active across all primitive implementations, refactors, and codebase reviews.

## 1. Quality Mindset
- Focus on robust primitive behavior, clean API ergonomics for Svelte 5 developers, and pristine TypeScript definitions.
- Avoid over-engineering: do not introduce unnecessary abstractions or speculative features.
- Keep the public API clean, predictable, and aligned with standard Base UI conventions.

## 2. Verification Baseline
- Always verify every change with:
  1. `bun run check`
  2. `bun run lint`
  3. `bun run prepack`
- Log all completed steps and evidence in `progress.md` and `feature_list.json`.
