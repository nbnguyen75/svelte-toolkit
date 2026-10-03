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

### Scope re-curation — roadmap rebuild + `useSmoothScroll`

- [x] Re-curated the roadmap against the maintainer's T1 / T2 / niche / extras
      tiers. `feature_list.json` is now **implement-only** (27 features, 141
      functions): no `cut` / `deferred` / `svelte-native` statuses, per-function
      `tier` where the roadmap named a function directly.
- [x] Removed 19 shipped modules that fall on the Vue-specific list (13
      `useArray*` + `useSorted` under `shared/`, `watchIgnorable`, `watchTriggerable`,
      `watchAtMost`, `watchArray`, `computedWithControl`, `createSharedComposable`)
      plus their 19 barrel lines. 203 tests deleted. Each one has a Svelte-native
      replacement, verified per module: `$effect` teardown / `untrack` for the
      watchers, `$state` revision + `$derived` for `computedWithControl`, context
      for `createSharedComposable`, template expressions + `$derived` for arrays.
- [x] `until` **kept** — Svelte has no await-a-reactive-condition primitive, so
      it is the only member of that group with no Svelte-native replacement.
- [x] Recipes moved wholesale into `docs/recipes.md` and grew 55 → **95 entries**
      with a new "Use instead" column per hook, since that file is the source the
      Astro migration docs render from. No `feature_list.recipe.json`: one source,
      not two. Includes the 19 removed modules, `useBoolean` → `useToggle`, and
      `useDebouncedCallback` → `useDebounceFn`.
- [x] Resurrected `useNow` / `useTimestamp` / `useTimeAgo` as Tier 2 (cut earlier
      in feat-011 / deferred in feat-012, wanted by the new roadmap).
- [x] Dropped 21 todo entries onto the Svelte-native list (`useElementSize`,
      `useMediaQuery`, `useWindowSize`, `useActiveElement`, …) and 9 Vue-specific
      ones (`toReactive`, `reactiveOmit`/`Pick`, `mergeProps`, `composeHandlers`,
      `createProjection`/`createGenericProjection`, …).
- [x] `feat-031` added for the extras (`Selection`, `useControllableState`,
      `useHotkeys`, `usePagination`); it is **not** `feat-030`, which belongs to the
      integrations package.
- [x] `useScrollToTop` → **`useSmoothScroll`**: `scrollToTop()` becomes
      `scrollTo(target, options)` taking `number | Element`, plus a `container`
      override per call, `interruptOnUserScroll` (default on) cancelling on
      `wheel` / `touchstart` / `keydown`, and `prefersReducedMotion` forcing
      `duration: 0`. Element targets resolve against the container's own rect and
      `scrollTop`, so they land correctly inside a scrolled frame.
- [x] Corrected a wrong assumption: `prefersReducedMotion` lives in
      `svelte/motion`, not a `svelte/reactivity/media-query` subpath (5.57.1 has no
      such export).
- [x] Gates: test 293/293 across 46 files (was 489/84), `svelte-check` 0/0,
      lint 0/0, format clean, prepack publint clean, no path leaks.

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

### feat-009 State essentials implemented (2026-10-02)

Eight local-state primitives under `src/lib/state/`, each with `index.svelte.ts`, an `index.ts` re-export shim, `README.md`, a jsdom suite, and an SSR probe: `useToggle`, `useCounter`, `usePrevious`, `useLastChanged`, `useCloned`, `useCycleList`, `useStepper`, `useOffsetPagination`.

- [x] **Nothing is delegated.** `svelte/reactivity` exports 7 symbols and none is a local-state primitive; there is no native or framework hook for a toggle, a clone, or a page count.
- [x] **`useToggle` never pushes a literal into a generic slot.** The first design mirrored the reference and did `true as T` for the boolean overload, which `no-unsafe-type-assertion` rejects (an assertion into an uninstantiated type parameter is unsafe by definition). The fix is that the two values reach `valuesToggle()` as _arguments_, so `T` is simply inferred as `boolean` on that overload and no assertion exists anywhere. The boolean overload therefore takes no options at all, and custom state requires both `truthyValue` and `falsyValue` - which is honest, because with a non-boolean type "toggle" is meaningless until both sides are named.
- [x] **`toggle()` vs `toggle(undefined)` needed the call arity, and the type carries it.** A default parameter cannot distinguish the two, but they must behave differently (`toggle()` flips, `toggle(undefined)` sets), so the arity is the signal. I first used `arguments.length`, which works but is legacy style; the shipped version uses a rest parameter typed `...args: [] | [T]`, so the distinction is expressed in the signature and the branch reads `args.length > 0`. Comparison uses `Object.is`, so `NaN` state toggles correctly (pinned by a test).
- [x] **`structuredClone` cannot read a Svelte reactive proxy - it throws `DOMException`.** Probed rather than assumed. `$state.raw` does not help (it does not de-proxy, and it is restricted to a declaration initializer). `$state.snapshot` does work, so the default clone is `structuredClone($state.snapshot(source))`.
- [x] **Naming that snapshot type without a cast took three attempts.** Svelte exports neither `Snapshot` nor `snapshot` publicly (both fail to import). Hand-writing a `ClonedSnapshot<T>` alias is rejected too, because TS cannot prove a hand-written conditional type matches Svelte's internal one for a deferred `T`. The shipped solution is `type ClonedSnapshot<T> = ReturnType<typeof defaultClone<T>>` - an instantiation expression on the clone function itself, so the type is exactly Svelte's with zero duplication and zero assertions. For plain data it resolves to `T`, which is what users actually see on `value`.
- [x] **`usePrevious` had a real bug in my first port that the tests caught.** I wrote `previous = read()` inside the effect, which stores the _current_ value instead of the prior one. Fixed by keeping a deliberately non-reactive `last` from the previous effect run: on each re-run, `last` is by definition the value the source held before the change. Returning `T | undefined` is honest, since that is what the getter yields before the first change.
- [x] **Value sources are static by design.** `usePrevious` / `useLastChanged` accept a plain value _or_ a getter, and only a getter (or a `$state` read) observes later changes. My first tests passed `box.value` snapshots and failed; the tests were wrong, not the utils, so they now pass getters.
- [x] **`useCycleList` reads list items with a non-null assertion justified by arithmetic.** `noUncheckedIndexedAccess` makes `list[i]` `T | undefined`, and narrowing that to `T` for an arbitrary `T` is not expressible without a cast. The wraparound computation `((i % len) + len) % len` already proves the index is in range, so `list[wrapped]!` is a true statement rather than a papering-over. An empty list reports `index === -1` and navigation is a no-op.
- [x] **`useStepper` keeps the reference's `unknown`-space implementation**, so both array steps (names are the values) and record steps (names are the keys) share one code path with no casts at all - not even the final return, because the impl signature declares the widened return type.
- [x] **`useOffsetPagination` change callbacks fire for every mutation path** (`next`, `prev`, and the `currentPage` setter), including clamped writes, and never during construction. Omitting `total` selects an overload that drops `isLastPage`, because an unbounded listing has no last page.
- [x] 91 new state tests (16 files, jsdom + SSR probes). Suite is now **266/266 across 42 files** (was 175/175 across 26). Barrel exports all 8 utils plus their option and return interfaces.
- [x] Gates: `check` 0/0, `format` clean (131 files), `lint` 0 errors 0 warnings, `test` 266/266, `prepack` publint "All good!", path-leak clean.
- [x] feat-009 marked `done` with all 8 functions `done`; feat-011's evidence was also backfilled (it had lost a `$effect` token to a text substitution).

### feat-010 Reactive array utils implemented (2026-10-02)

Thirteen pure reactive array transforms under `src/lib/shared/`, each with `index.svelte.ts`, an `index.ts` re-export shim, `README.md`, a jsdom suite, and an SSR probe: `useArrayMap`, `useArrayFilter`, `useArrayUnique`, `useArraySome`, `useArrayEvery`, `useArrayIncludes`, `useArrayJoin`, `useArrayReduce`, `useArrayFind`, `useArrayFindIndex`, `useArrayFindLast`, `useArrayDifference`, `useSorted`.

- [x] **Twelve of the thirteen are one `$derived` over a native array method** - the whole batch is a thin reactive shell around the platform, so the work was in the types, not the algorithms.
- [x] **Every overloaded third argument is dispatched with zero casts.** `useArrayIncludes` / `useArrayDifference` / `useSorted` accept a comparator function, a `keyof T`, or an options object. The reference repo cast that `unknown` argument at each branch; here the implementation signature declares the parameter as the _union_ of the three shapes, so `typeof === 'function'` and a declared `isOptions` guard narrow it properly. The naive `isObject` guard had to go: its `value is Record<PropertyKey, unknown>` predicate turns the union into `'{} | null'` intersections and the comparator stops typechecking.
- [x] **`useArrayReduce`'s overloads cannot be expressed in one generic pair, so the implementation signature collapses to one.** Native `reduce` ties the accumulator to the element type only when there is no seed, and TS cannot carry that relation across an overload boundary. The public surface still has both overloads (no-seed infers `T`, seeded infers a distinct `U`); the shared implementation is single-generic and calls native `reduce` on both paths, so index-from-1, throw-on-empty, and the `U` accumulator all come from the platform with **no assertion**.
- [x] **`useSorted`'s default comparator avoids the reference's `as unknown as`.** `defaultNumericCompare` was typed `(a: number, b: number) => number` and cast into `UseSortedCompareFn<T>` at the assignment. The shipped default is `Number(a) - Number(b)`, which performs exactly the `ToNumber` conversion the `-` operator does, so numeric strings still sort numerically and the function is assignable to the generic signature with no cast.
- [x] **Two hand-rolled loops were replaced by the platform.** `useArrayFindLast` and `useArrayUnique`'s default path each wrote a manual reverse scan / O(n²) dedupe in the reference. Native `findLast` and `Set` do the same thing, and `Set` already applies `SameValueZero`, which is what the reference's own comment claimed but its `Object.is` loop got wrong for `0` vs `-0`. Tests pin the platform semantics (`NaN` self-matches, `0`/`-0` collapse).
- [x] **`useSorted` `dirty` mode registers an `$effect`, so it is client-only by construction.** Copy mode is pure derived logic and is what the SSR probe exercises; `dirty` splices the source in place only when the order actually changed, which is what makes the effect settle instead of re-triggering itself (pinned by a "does not loop" test). `defaultSort` uses `toSorted` rather than `sort`, so even the default path never mutates the array the caller handed in.
- [x] 158 new tests across 26 files (13 jsdom + 13 SSR probes). Suite is now **424/424 across 68 files** (was 266/266 across 42).
- [x] Barrel resolves all 13 functions plus 22 option/return interfaces. Verified with a throwaway type-level guard file under `src/` (`Exclude<Required, keyof typeof barrel> extends never`), because a symbol exported from two paths is dropped silently and `svelte-check` alone would not catch it.
- [x] `useArrayIncludes/types.ts` was folded into `index.svelte.ts`: the separate file was not reachable from the barrel, so its exported interfaces would have been missing from the public surface.
- [x] Gates: `check` 0/0, `format` clean (196 files), `lint` 0 errors 0 warnings, `test` 424/424, `prepack` publint "All good!". Three lint findings were fixed without suppressions: `prefer-svelte-reactivity` (use `SvelteSet` from `svelte/reactivity` for the dedupe), `unicorn/consistent-function-scoping` (hoist `missing` in `useArrayDifference`), `unicorn/no-array-sort` (`toSorted`).
- [x] **Pre-existing corruption found and repaired:** `session-handoff.md` held three invalid UTF-8 byte sequences where em dashes belonged, which made `oxfmt` fail to read the file entirely ("binary or inaccessible") and would have failed `bun run format` for every future session. Repaired to `—`; the file now formats. A repo-wide scan (`*.ts,js,svelte,md,json`) confirms it was the only affected file.
- [x] feat-010 marked `done` with all 13 functions `done`.

### feat-013 Reactive watchers implemented (2026-10-02)

Five watcher utilities under `src/lib/state/`, each with `index.svelte.ts`, an `index.ts` re-export shim, `README.md`, a jsdom suite, and an SSR probe: `watchIgnorable`, `watchTriggerable`, `watchAtMost`, `watchArray`, `until`.

- [x] **Svelte has no `watch` primitive, so every port is a Svelte-idiomatic `$effect` + `untrack` rewrite**, not a mechanical translation. Vue's `flush`/`deep`/`once`/`onTrack`/`onTrigger`, multi-source arrays, and `WatchHandle` are dropped; the callback becomes `(value, oldValue, onCleanup)` and the source is `MaybeGetter<T>`. `$state` proxies already track nested reads, so Vue's `deep` has no meaning here.
- [x] **Eight one-liners are `cut` as recipes**, already documented in `docs/recipes.md`: `watchOnce`, `watchImmediate`, `watchDeep`, `whenever`, `watchDebounced`, `watchThrottled`, `watchPausable`, `watchWithFilter`. Plain `$effect` covers them; `watchDeep` needs nothing at all.
- [x] **The reference's `as unknown as` casts were eliminated, not ported.** `until`'s array/value dispatch no longer asserts: the impl returns a concrete union and `createArrayUntil` narrows its snapshot with `Array.isArray`, so the type is honest. `watchTriggerable.trigger()` returns the callback result because `ignoreUpdates` is generic (`<R>(updater) => R`), replacing the reference's `return result as R`.
- [x] **A real reference bug was fixed in `watchIgnorable`.** The reference set a boolean `ignoreNext` around `ignoreUpdates`; because Svelte batches effects, a no-op updater (or a same-value write) left the flag armed and silently dropped the _next_ genuine change. The shipped version syncs `lastSeen = resolveGetter(source)` synchronously after the updater, so the upcoming run sees no change and a no-op cannot leave a stale skip behind.
- [x] **Unmount cleanup now works for every watcher.** The reference only ran the pending `onCleanup` on explicit `stop()`; each `$effect` here returns a teardown, so unmount flushes it too. `watchTriggerable` (whose `watchIgnorable` receives a wrapper that owns no cleanup) adds one dedicated teardown effect for this. Pinned by a per-module "runs the pending cleanup when the owner unmounts" test.
- [x] **`until` documents its real context constraint.** It constructs a `$effect`, so it must be called during component initialization (or inside `$effect.root`); on the server the effect is inert, so an _already-matching_ matcher resolves synchronously while one that must wait cannot. The SSR probe pins both cases and a non-matching `Promise.race` that stays pending.
- [x] Three lint findings fixed without suppressions: `method-signature-style` (property signatures across all five return/instance types), `unicorn/no-new-array` (`oldList.map(() => false)`), and `typescript/unbound-method` (wrap the forwarded `watchIgnorable` controls in arrows). The `no-shadow` warning from the generic `trigger` wrapper was renamed to `TResult`.
- [x] 45 new tests across 10 files (5 jsdom + 5 SSR). Suite is now **469/469 across 78 files** (was 424/424 across 68).
- [x] Gates: `check` 0/0, `format` clean, `lint` 0 errors 0 warnings, `test` 469/469, `prepack` publint "All good!", path-leak clean. Barrel resolves 5 new functions (50 → 55 runtime exports).
- [x] feat-013 marked `done`: 5 functions `done`, 8 `cut`.

### feat-014 Ref variants & shared state implemented (2026-10-02)

Re-scoped from 8 kept to **3** before implementation, then shipped: `refAutoReset`, `computedWithControl`, `createSharedComposable` under `src/lib/state/`, each with a README, a jsdom suite, and an SSR probe.

- [x] **Five more functions were `cut` as recipes** after re-reading them against `scope.md` §3: `refManualReset` (a `$state` cell plus a `reset()`), `refWithControl` (a setter function; `untrackedGet` is native `untrack`), `createEventHook` (Svelte callback props supersede a hand-rolled emitter, and nothing in this package consumes one), `createGlobalState` (a six-line lazy memo — §2 already tells users to write their own factory or use context), and `syncRef` (its microtask loop-breaker plus `as unknown as` casts, inconsistent with `syncRefs` which was already cut). Their rows were added to `docs/recipes.md`.
- [x] **`refAutoReset` arms its timer only in the browser.** On the server `$effect` is inert, so the cleanup that clears a pending timer never runs — a timer armed during SSR could outlive the render. The setter still stores the value; it just skips `setTimeout`, which is probed by the SSR test.
- [x] **`refAutoReset` re-resolves getter arguments per write**, matching VueUse: every set cancels and re-arms, so `() => fallback` and `() => wait` can track reactive state. Pinned by a test that changes the delay between two writes.
- [x] **`computedWithControl` caches by revision, not by truthiness.** The reference cached into `T | undefined` and returned `cached as T`, which is both a cast and wrong for a legitimately `undefined` `T`. Storing `{ value: T } | undefined` makes the cache honest and the return cast-free; a test asserts a `() => undefined` derivation still runs once.
- [x] **`computedWithControl` reads `fn` untracked and only `source` decides recomputation**, which is the whole point of the "with control" variant. Two tests pin both halves: a source change recomputes, and a change to state read _inside_ `fn` does not.
- [x] **`createSharedComposable` holds its cache in a `{ value: R }` wrapper**, because the reference's `if (state === undefined)` re-invoked any composable that returns `undefined`. The server branch returns the composable untouched, so no instance is shared between requests — pinned by an SSR test that asserts two calls produce two distinct objects.
- [x] **The no-refcount ceiling is documented rather than hidden.** VueUse disposes the shared instance when the last consumer unmounts via `effectScope`; a Svelte port cannot without a subscriber protocol, so the README and JSDoc say so and point at context instead.
- [x] `createSharedComposable` ships as a single `index.ts` — it uses no runes, and `module-contract.md` §1 requires pure logic to stay compiler-free.
- [x] Four lint findings fixed by autofix without suppressions: `perfectionist/sort-interfaces` (`trigger` before `value`) and `perfectionist/sort-object-types` (`set` before `get` in the writable overload's inline type).
- [x] 20 new tests across 6 files (3 jsdom + 3 SSR). Suite is now **489/489 across 84 files** (was 469/469 across 78).
- [x] Gates: `check` 0/0, `format` clean, `lint` 0 errors 0 warnings, `test` 489/489, `prepack` publint "All good!", path-leak clean. Barrel resolves 3 new functions (55 → 58 runtime exports).
- [x] feat-014 marked `done`: 3 functions `done`, 10 `cut`.

### Roadmap re-curation: core / svelte-base split (2026-10-02)

- [x] **The core / `svelte-base` split is settled.** `feat-029` was a grab-bag of 8 `svbase` internals sitting at tier T1 alongside `feat-031`'s 4 Base UI extras — two features with the same intent. They are now one feature, `feat-029` "svelte-base ports", tier `extra`, 11 functions, each carrying `package: "svelte-base"`. Nothing in it ships in this package; it is a recorded backlog so the split is not re-litigated. The package does not exist yet, so the feature is blocked.
- [x] **Read every svbase source before judging**, rather than classifying by name. That is what separated the two real promotions from the eight rejects.
- [x] **Eight rejected for `scope.md` §3**, each with the reason recorded in `feat-029.description` and `session-handoff.md`: `clickOutside`/`escapeKey` (attachments, and both duplicate `onClickOutside` / `onKeyStroke`), `contextHelpers` (a `setContext`/`getContext` wrapper — a recipe already points at the natives), `getCheckableDataAttributes` (presentational checkbox/switch mapping), `nextRovingTarget` (real algorithm, but only a composite primitive consumes it), `sliderMath` (six exports that only a slider needs), `tooltipDelay` (module-shared mutable state, banned by §2), `trackOutsidePress` (nested overlay dismissal that core deliberately does not do), `Selection`/`useHotkeys`/`usePagination` (Base UI state managers; `usePagination` also overlaps shipped `useOffsetPagination`).
- [x] **Two promoted to core as `feat-032` "Ids & controllable state" (T2).** `useId`: env branching (ids must match across SSR and hydration, §3.2) plus being a building block (§3.4). Must be built on `$props.id()`; the svbase counter + `Math.random()` form is not portable as written (§2, and unstable across server/client). `useControllableState`: non-trivial reactive state core lacks, which `useToggle`/`useCounter`/`useStorage` each re-invent, and Svelte has no controlled/uncontrolled primitive.
- [x] **`feat-031` dissolved.** Its Base UI extras were folded into `feat-029` (`Selection`, `useHotkeys`, `usePagination`) or promoted to `feat-032` (`useControllableState`). `feat-030` still belongs to the integrations package.
- [x] **Stranded `recipe-only` tier removed.** `feat-027` and `feat-028` held 3 real VueUse functions in a bucket that was never part of the tier scheme. Merged into `feat-027` "Reactive math & value coercion" (**T2**): `useClamp`, `usePrecision`, `useToNumber`. `useClamp` is the load-bearing one — `sliderMath.clamp` moves out to `svelte-base`, so core needs its own.
- [x] **Fixed a stale `note` in `feature_list.json`** that pointed at `notPortedRef`, a key the file does not have. It now names `recipeRef` and documents the `package: "svelte-base"` carve-out.
- [x] **`useTimeAgo` was NOT resurrected.** An earlier session log claimed it was; `feature_list.json` never gained it. Current state is the coherent one — `useNow`/`useTimestamp` are reactive with no native equivalent (T2, `feat-011`), while `useTimeAgo` is pure formatting that native `Intl.RelativeTimeFormat` covers, so it stays a recipe.
- [x] `AGENTS.md` documents the `package: "svelte-base"` exception next to the other `feature_list.json` rules.
- [x] Validated: no duplicate function names across features, no duplicate feature ids, no todo function missing a `target`, no illegal `tier` values. Counts are now **26 features / 142 functions**, 15 todo features, 110 todo functions, 11 of them on the base backlog.
