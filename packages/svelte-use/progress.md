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
- [x] Marked `feat-001` `done` in `feature_list.json` with evidence. (commit `7815a59`)

### useScrollToTop — feat-002 first slice (2026-10-01)

- [x] Ported `useScrollToTop` from the `sv-utils` reference into `src/lib/browser/useScrollToTop/` (`index.svelte.ts`, `index.ts`, `README.md`, `useScrollToTop.test.ts`, `useScrollToTop.ssr.test.ts`).
- [x] Added the shared helpers it depends on: `src/lib/shared/is.ts` (`isBrowser`) and `src/lib/shared/getter.ts` (`MaybeGetter`, `resolveGetter`). All three exported from the barrel; verified the barrel resolves at runtime (`isBrowser, resolveGetter, useScrollToTop`).
- [x] Ports the documented `feat-008` fix up front: the generation guard (`runId`) plus `cancel()` handle mean a superseded or cancelled run performs no writes and never touches shared state — covered by tests, so that item is resolved here rather than retrofitted later.
- [x] Lint clean without suppressions: fixed `method-signature-style` (property signatures), replaced two `no-unsafe-type-assertion` casts with a real `isGetter` type guard and a structural `'scrollY' in el` check, and hoisted the pure `getScrollTop`/`setScrollTop` helpers to module scope (also clears `consistent-function-scoping`). Zero errors, zero warnings.
- [x] **Test-harness finding (matters for every later batch):** Svelte's `Tween` is driven by an internal rAF loop that reads `performance.now()`, _not_ the rAF timestamp argument — so `test/fixtures/raf.ts` cannot drive it. Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` instead (it fakes both `requestAnimationFrame` and `performance`). Real-time `setTimeout` sleeps in the reference test were replaced with fake timers per `test-contract.md`.
- [x] **SSR-test finding:** in the `node` environment `svelte` resolves to its **server** build, where runes are inert and `$effect.root` never invokes its callback. An SSR probe must therefore call the factory _directly_ (no effect root, no mount) — which is what real SSR does. An earlier `render()`-from-`svelte/server` attempt silently produced nothing.
- [x] Gates: `check` 0/0, `format` clean (38 files), `lint` 0 errors, `test` 16/16 (4 files, 9 new), `prepack` publint clean, path-leak scan clean, `npm pack --dry-run` shows 13 files with `*.test.js` excluded.
- [x] `useEventListener` (feat-002): 5 overloads typing `event`/`handler` per target (Window/Document/HTMLElement/MediaQueryList/generic `EventTarget`), each with its own `@example` per `docs-contract.md` §2. Deliberately drops VueUse's array-of-targets/events/listeners and the returned `stop` handle — unmount is disposal, and the simplification is documented in the README's parity notes.
- [x] **feat-003 landed first, out of dependency order:** `useDark` imports `useLocalStorage`, so `useStorage`/`useLocalStorage`/`useSessionStorage` had to exist first. Ported ahead of the remaining feat-002 utils rather than stubbing the dependency.
- [x] `useStorage` default serializer rewritten to avoid a cast. The reference used `JSON.parse(raw) as T` and `raw as unknown as T`; `typescript/no-unsafe-type-assertion` rejects both, and probing confirmed `unknown as T` is flagged for _any_ generic target — so the pattern is unreachable, not just awkward. `.agents/rules/typescript.md` prescribes the alternative ("use `unknown` with runtime type guard"), so `read` now validates the decoded value's runtime shape against `defaultValue` through a `value is T` type predicate and falls back to the default on mismatch. Stronger than the reference: a corrupt or foreign payload can no longer be handed back as a lie.
- [x] Documented the guard's real limit: it is only as strong as the default value, so an **empty** array default (`[] as string[]`) constrains nothing about element types. Pinned with a test using three distinct storage keys (a rejecting cell writes through and would otherwise clobber the payload the next cell reads).
- [x] `useDark` and `useClipboard` ported. Removed the reference's `as MediaQueryListEvent` cast by typing the `useEventListener` overload directly. Renamed the default storage key `sv-color-scheme` → `svelte-use-color-scheme` (the published package is not `sv-utils`). Documented that `toggle()` resolves `auto` first, and that a denied clipboard write _rejects_ rather than swallowing (VueUse swallows; `copy` already returns a promise, so the caller can catch).
- [x] `useEventListener`: hoisted attach/detach into a module-scope `bindListener` returning a no-op for nullish targets — the reference's early `return;` tripped `consistent-return`, and an `undefined` cleanup is not a valid `$effect` return anyway.
- [x] Lint clean with no suppressions: `method-signature-style` (property signatures on `UseDarkReturn`/`UseClipboardReturn`), `no-unsafe-assignment` (explicit `unknown` on array element reads), `perfectionist/sort-object-types` on the parse-result union, and `svelte-check`'s "implementation name must be `useEventListener`" (helper had to move above the overload list, not between the last overload and the implementation).
- [x] Corrected one wrong test of my own: I asserted an empty array default would reject `[1,'b']` for a `string[]` cell. It cannot — there is no element-type information to check against. The guard was right; the expectation was rewritten to assert the actual (documented) behavior.
- [x] Gates: `check` 0/0, `format` clean (58 files), `lint` 0 errors 0 warnings, `test` 60/60 (12 files), `prepack` publint clean, path-leak scan clean. Barrel resolves 9 exports at runtime (`isBrowser, resolveGetter, useClipboard, useDark, useEventListener, useLocalStorage, useScrollToTop, useSessionStorage, useStorage`).
- [x] feat-002 and feat-003 marked `done` in `feature_list.json` with evidence.
