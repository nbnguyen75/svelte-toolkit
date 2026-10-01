# Progress — `@wynn-dev/svelte-use`

## Session Log

### Harness setup (svelte-toolkit)

- [x] Migrated agent harness into `packages/svelte-use/`: `AGENTS.md`, `.agents/` (rules + skills), `.claude/`, `skills-lock.json`.
- [x] Migrated tooling: `oxlint.config.ts`, `oxfmt.config.ts`, `shared-ignore.config.js`, `eslint.config.js` (perfectionist), strict `tsconfig.json`, `vitest.config.ts`, `test/` fixtures, `docs/` templates.
- [x] `package.json`: bun scripts (`check`, `format`, `lint`, `test`, `prepack`), Oxc + Vitest devDeps; Prettier removed.
- [x] `init.ps1` / `init.sh` verification gates incl. path-leak scan.
- [x] Copied `feature_list.json` roadmap (VueUse port tracking); `src/lib/` implementation starts empty.
- [x] Repo-root and `packages/` `AGENTS.md` files are refer-only pointers to `packages/svelte-use/AGENTS.md`.
- [x] Harness smoke tests made `src/lib`-independent (harness stays green before any port); removed `ssr-window-size.svelte` fixture (returns with its port).
- [x] Baseline `init.ps1` green: check 0/0, format clean, lint 0 errors, test 6/6, prepack publint clean, path-leak scan clean. Harness validator 100/100.

### Two-package split + integrations setup

- [x] `scope.md` §7: core (0 deps) vs `svelte-use-integrations` (optional peerDeps, core as peer) vs recipes; naming rules — `useXxx()` functions, `Attachment` factories without `use` (no legacy actions), PascalCase classes, "utilities" terminology; Runed prior-art check.
- [x] Renamed `@wynn-dev/integrations` → `@wynn-dev/svelte-use-integrations` (scope, ponytail, recipes); `module-contract.md` covers attachment layout. (feat-030 later moved to the sibling package's own `feature_list.json` — see below.)
- [x] Kept `typeof window` guards over `esm-env` `BROWSER` (already the rule — preserves zero-dep core).
- [x] `packages/svelte-use-integrations/`: same Oxc/Vitest tooling, self-contained smoke tests, own `AGENTS.md` (refer-only to core harness + package contract), `init.*` green: check 0/0, format clean, lint 0 errors, test 6/6, prepack publint clean, no leaks.
- [x] `svelte-use` re-verified after edits: `init.ps1` green, validator 100/100.

### Pure-library de-kit + fresh feature list

- [x] Removed SvelteKit app shell (`src/routes/`, `src/app.html`, `src/app.d.ts`, `static/`, `.svelte-kit/`) — pure `svelte-package` library.
- [x] Dropped `@sveltejs/kit` + adapter deps/scripts; `vite.config.ts` uses `@sveltejs/vite-plugin-svelte`; self-contained `tsconfig.json` (no `.svelte-kit` extend).
- [x] Converted `shared-ignore.config.js` → `.ts` (svelte-check include conflict); all three tools load it fine.
- [x] Gates green: check 0/0, format clean, lint 0 errors, test 6/6, prepack publint clean.
- [x] `feature_list.json` reset to fresh v1.0.0: 22 features + 121 functions `done` → `todo`, all evidence cleared; `cut`/`deferred`/`svelte-native` scope decisions kept; feat-029 specs now per test-contract.

### Package separation (self-contained modules)

- [x] `feat-030` moved out of this list into `packages/svelte-use-integrations/feature_list.json` (own v1.0.0, local targets). This list now tracks core only (29 features).
- [x] Integrations owns its harness (`.agents/` rules adapted + full skill library), state, and roadmap; core may be a `workspace:*` dep of integrations when needed, never the reverse.

## Next

- Pick the first feature from `feature_list.json` and follow `.agents/rules/batch-workflow.md`.

### feat-001 close-out (2026-10-01)

- [x] Ran full `init.ps1` gate sequence from `packages/svelte-use/`: `check` 0 errors/0 warnings, `format` clean (31 files), `lint` 0 errors, `test` 6/6, `prepack` publint clean, path-leak scan clean.
- [x] One repair: `svelte-check` warned "no svelte input files" (pure library, zero `.svelte` under `src/` after the test-scope tightening). Added `test/fixtures/**` to `tsconfig.json` `include` — fixtures are harness support code (not `*.test.*` specs, still excluded), so they are now typechecked and the warning is gone.
- [x] Marked `feat-001` `done` in `feature_list.json` with evidence.
