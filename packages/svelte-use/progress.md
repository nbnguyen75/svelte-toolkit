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

### feat-004 — timing utilities (2026-10-01)

- [x] `useDebounceFn` and `useThrottleFn` ported from the sv-utils reference (lodash-style `leading`/`trailing`/`maxWait`, vendored zero-dep). Both stayed plain `.ts` — no runes, no DOM, no effect scope — so they are SSR-safe by construction and need no `.svelte.ts` variant.
- [x] Replaced the reference's `lastArgs as Args` casts with a narrowed `invokeLatest()` helper. `no-unsafe-type-assertion` rejects an assertion to a generic `Args` (same rule that blocked `useStorage`), and a truthiness guard is both lint-clean and more honest: a cleared burst can never fire `fn` with `undefined` args.
- [x] Fixed a real ordering bug carried by the reference's throttle: it cleared `timer` _after_ invoking, so a re-entrant call from `fn` saw a still-armed timer and silently queued a second trailing invocation. Now `timer` is cleared before `invokeLatest()`. Pinned with a re-entrancy test that also proves the chain is bounded rather than recursing.
- [x] Wrote that re-entrancy test against my own wrong expectation first (assumed one re-fire per step; the correct behavior is one fresh window per re-entrant call, advancing to the caller's own bound). Rewritten to assert the real behavior.
- [x] Added coverage the reference lacked: multi-argument forwarding for both, `useDebounceFn` post-cancel no-fire, and the both-edges-off throttle case pinned to VueUse `throttleFilter` semantics.
- [x] Documented the operational caveat neither the reference nor VueUse states: the wrappers hold no effect scope, so **nothing disposes them for you** — call `cancel()` in an `$effect` teardown or a pending invocation can fire after teardown. Also noted `Date.now()` wall-clock window drift and that these are not event filters (no promise, no `this`).
- [x] Deliberate API divergence: VueUse's `throttleFilter` takes positional `(ms, trailing, leading)` or an object; this port takes only an options object, so the argument order cannot be misread.
- [x] Gates: `check` 0/0, `format` clean (64 files), `lint` 0 errors 0 warnings, `test` 85/85 (14 files), `prepack` publint clean, path-leak clean. Barrel resolves 11 exports at runtime.

### svelte/reactivity adoption — peer floor + `useDark` (2026-10-01)

- [x] Raised `peerDependencies.svelte` from `^5.0.0` to `^5.11.0`. `svelte/reactivity` landed in **5.7.0**, `svelte/reactivity/window` in **5.11.0**; the range is set to the later floor so it never has to move again. This was a latent lie before: a subpath import fails at _build_ time, not install time, so under `^5.0.0` a consumer on 5.4 passed the peer check and npm reported success, then the build died on module-not-found. The range is the only thing that can catch it.
- [x] Migrated `useDark` from a hand-rolled media-query subscription to Svelte's `MediaQuery` primitive. This fixed a real defect, not a style preference: the old code passed `() => window.matchMedia(DARK_MEDIA_QUERY)` as a getter to `useEventListener`, and a getter re-resolves on every effect run — so each run constructed a fresh `MediaQueryList` and rebound a listener. One `MediaQuery` per `useDark()` call now, with shared teardown. `$state` for `preferred` is gone; the value comes from `prefersDark.current`.
- [x] Kept the SSR guard: `MediaQuery`'s constructor calls `window.matchMedia`, so it is still constructed behind `isBrowser` (and it resolves to a stub server-side anyway, per `scope.md` §5.2). All 11 existing `useDark` tests pass unchanged, including the SSR variant — the suite already stubbed a faithful `MediaQueryListEvent` shape specifically for Svelte's event propagation.
- [x] Deliberately did **not** migrate `useEventListener` to `createSubscriber`. That util returns `void` and exposes no reactive value to read, so a subscription mechanism buys nothing, and its five overloads type by event map either way. Recorded in `scope.md` §5.3 so it does not get re-proposed.
- [x] Recorded the settled floors, the SSR-stub behavior, the coverage limit, and the `useDark` no-revert note in `.agents/rules/scope.md` §5.1–§5.4; mirrored the floor and the "no timer primitive" finding in `AGENTS.md` working rules.
- [x] **Coverage finding worth keeping:** the module exports 7 symbols and **none is a timer**. There is no `useIntervalFn`/`useTimeoutFn`/`useRafFn`/`useCountdown`/`useFps` primitive, so feat-011's timing batch cannot delegate and must be hand-rolled. There is also no collection- or URL-shaped util in the roadmap, so `SvelteSet`/`SvelteMap`/`SvelteURL` have no current caller. Adoption is at the point of use, not a policy.
- [x] Gates: `check` 0/0, `format` clean, `lint` 0 errors 0 warnings, `test` 85/85 (14 files), `prepack` publint clean, path-leak clean. Verified `dist/browser/useDark/index.svelte.js` emits `import { MediaQuery } from 'svelte/reactivity'` as an external import (not bundled).

### feat-005/006/007/008 reconciled + feat-007 implemented (2026-10-01)

Recon pass before writing any code: three features claimed work that already existed, and the filesystem (not `status`) was the authority.

- [x] **feat-005 verified already satisfied, not re-implemented** — vitest ^5.0.2 + jsdom ^30.1.1, `scripts.test = vitest run`, packaging excludes `!dist/**/*.test.*` / `!dist/**/*.spec.*`, `test/setup.ts` + 8 fixtures, 2 harness self-tests, and `bun run test` wired into **both** `init.ps1` and `init.sh`. Docs convention: `.agents/rules/docs-contract.md` + `docs/module-readme-template.md`, and all 5 shipped modules carry a `README.md`.
- [x] **feat-006 verified satisfied by `fbe6720`** — `useThrottleFn.flush()` at `src/lib/utilities/useThrottleFn/index.ts:18,88`; semantics aligned to VueUse's `debounceFilter`/`throttleFilter` and vendored zero-dep (no lodash import). The inherited ordering bug was already fixed and pinned.
- [x] **feat-008 verified already applied** — `useClipboard` disposes its reset timer and drops in-flight copies (`useClipboard/index.svelte.ts:47-49`); `useScrollToTop` has the cancel handle + generation guard (`index.svelte.ts:85-97,122`). Backfill confirmed: 5/5 modules have index + README + test.
- [x] **feat-003 closed** — its three functions were `done` but the feature status was still `todo` (a leftover from an earlier bulk edit). Verified shipped, then flipped with evidence.
- [x] **feat-007 implemented:** `src/lib/shared/is.ts` now exports 14 symbols — `isBrowser`, `isClient`, `isWorker`, `isDef`, `notNullish`, `isObject`, `hasOwn`, `noop`, `now`, `timestamp`, `rand`, `clamp`, `assert`, `isIOS`. Full parity with VueUse `shared/utils/is.ts`, pure functions and immutable constants only. 36 tests across `is.test.ts` (33, jsdom) and `is.ssr.test.ts` (3, node) covering every branch.
- [x] **Matched VueUse exactly where a "better" version would have been a lie.** `timestamp()` returns `Date.now()`, **not** `performance.now()` — VueUse's is `+Date.now()`, so a high-resolution variant would silently diverge from parity and from every consumer's expectation. Documented rather than "improved". `isObject` is the `[object Object]` brand check, so it rejects `Date`/`Map`/`Set` but **accepts** class instances; `assert` is a `console.warn` tripwire that never throws and never narrows — I first wrote a throwing `asserts value is T` and a `performance.now()` timestamp, then reverted both to VueUse's semantics.
- [x] **Three lint/typecheck traps in `isWorker`.** `WorkerGlobalScope` is declared in the WebWorker lib, not the DOM lib this package compiles against, so a bare identifier fails `svelte-check`. Narrowing `globalThis` with an assertion fails `no-unsafe-type-assertion`, and TS does not carry a type-guard narrowing on the _global identifier_ either. Resolved with a type guard on a **parameter** (`workerScopeOf(globalThis)`), which narrows correctly without any assertion. `Object.prototype.toString` also had to be wrapped in an arrow (`objectBrand`) to clear `unbound-method`.
- [x] **jsdom test-harness finding:** `vi.spyOn(navigator, 'maxTouchPoints', 'get')` throws `property is not defined` — jsdom's `Navigator` omits it entirely. Shadowed both `userAgent` and `maxTouchPoints` with `Object.defineProperty` own-properties instead, restoring the original descriptors afterwards.
- [x] Gates: `check` 0/0, `format` clean (66 files), `lint` 0 errors 0 warnings, `test` **121/121 (16 files)** — up from 85/85, `prepack` publint clean, path-leak clean. Barrel resolves **24** exports at runtime (was 11).
- [x] feat-003, feat-005, feat-006, feat-007, feat-008 all `done` with evidence. **feat-011 is now unblocked** (deps feat-005 + feat-008 both done).

### feat-011 Timing core implemented (2026-10-01)

`useTimeoutFn` → `useIntervalFn` → `useCountdown` → `useRafFn` → `useFps`, each in `src/lib/utilities/<name>/` with `index.svelte.ts`, an `index.ts` re-export shim, `README.md`, a jsdom suite, and an SSR probe.

- [x] **All five are hand-rolled.** `svelte/reactivity` exports 7 symbols and none is a timer — no interval, timeout, rAF, or countdown primitive exists to delegate to.
- [x] **Every timer is armed inside `$effect`,** which is the whole SSR story: the effect never runs on the server, so `immediate: true` cannot start a server-side timer that holds the process open, and the effect's own teardown releases the timer or cancels the pending frame on unmount. No `tryOnScopeDispose` shim is needed anywhere in this batch.
- [x] **`useTimeoutFn` keeps VueUse's argument forwarding without `any`.** VueUse types the callback `AnyFn` (`(...args: any[]) => any`) purely so its _no-argument_ immediate edge typechecks, and its `start` signature is `(...args: Parameters<CallbackFn> | [])`. I first mirrored that with a `[] as unknown as Args` cast — `no-unsafe-type-assertion` rejects it, and widening the public signature to `Args | []` then breaks `cb(...args)` on the delayed edge. The fix was to route the mount-driven arming through an `arm(fire: () => void)` helper, so the mount path uses an argument-erased alias and `start`'s delayed edge calls `cb(...args)` directly. Public types stay `unknown[]`-clean.
- [x] **`useIntervalFn` lost a condition rather than suppressing a lint error.** `oxlint`'s `no-unnecessary-condition` flagged VueUse's `if (isActive)` re-check after `immediateCallback` as always-truthy. It is _not_ statically redundant — a callback that calls `pause()` must not leave a live interval — but the linter cannot see the mutation through a user callback. Instead of a suppression, `resume()` now arms the interval **before** invoking `immediateCallback`, so a nested `pause()` clears the timer itself. Same observable result, one fewer branch, and the rule is satisfied honestly.
- [x] **`useIntervalFn` runs the interval-watching logic in a second `$effect` that deliberately has no cleanup.** Folding it into the lifecycle effect would mean unmount could be read as a "stop" request. Restarting is gated on the active state, so the second effect skips while paused.
- [x] **`useCountdown` keeps the `scheduler` injection seam** (chosen over a hard-coded `setInterval`) so the countdown's own logic holds no real timer and tests can drive it frame by frame; a custom scheduler also lets a consumer run the countdown off `useRafFn`.
- [x] **`useRafFn` re-checks the active flag at the top of each frame,** which is what makes `pause()` called from inside the callback stop the loop with no stray frame queued. `fpsLimit` is resolved per frame and skipped frames do not contribute to the next `delta`, so a delivered delta always spans real elapsed time.
- [x] **`useFps` samples on `performance.now()`, not the rAF timestamp,** matching VueUse: a backgrounded tab throttles frames, and the wall-clock gap is what the number means to a reader. Tests drive `performance.now` and the frame timestamps in lockstep so the readings are deterministic.
- [x] 54 new tests. Suite is now **175/175 across 26 files** (was 121/121 across 16). Barrel resolves **29** exports (was 24).
- [x] Gates: `check` 0/0, `format` clean (91 files), `lint` 0 errors 0 warnings, `test` 175/175, `prepack` publint "All good!", path-leak clean. `npm pack --dry-run`: 64 files, no test/spec files, no `.svelte.ts` sources, READMEs included.
- [x] One test caught a bug in itself: the `useTimeoutFn` SSR probe called `stop()` before asserting `isPending === true`. Reordered rather than weakened.
