# Session Handoff — svelte-use

## Current State

- Harness and tooling configured in `packages/svelte-use/` (see `progress.md`).
- Pure library package (no SvelteKit shell). **22 util modules shipped**:
  - `browser/`: `useEventListener`, `useDark`, `useClipboard`, `useSmoothScroll`
  - `state/`: `useStorage`/`useLocalStorage`/`useSessionStorage`, `useToggle`,
    `useCounter`, `usePrevious`, `useLastChanged`, `useCloned`, `useCycleList`,
    `useStepper`, `useOffsetPagination`, `refAutoReset`, `until`
  - `utilities/`: `useDebounceFn`, `useThrottleFn`, `useTimeoutFn`,
    `useIntervalFn`, `useCountdown`, `useRafFn`, `useFps`
  - `shared/`: `is.ts` (14 guard/predicate exports) and `getter.ts` — internal
    helpers, **not** utils.
- Suite: **293 tests / 46 files**. `dist` builds, `publint` clean.
- `feature_list.json` is **implement-only**: 27 features, 141 functions, no
  `cut`/`deferred`/`svelte-native` statuses. Per-function `tier`
  (`T1`/`T2`/`niche`/`extra`) where the roadmap named a function directly;
  otherwise the feature's `tier` applies.
- `docs/recipes.md` holds **all 95** deliberately-not-ported hooks with a
  "Use instead" column, and is the source the Astro migration docs render from.
  There is **no** `feature_list.recipe.json` — do not create one.

## Immediate Next Task

- **Roadmap order is by tier, not by feature id.** Tier 1 first:
  - `feat-016` viewport/media — only `useBreakpoints` (plus `useTextDirection`,
    `usePreferredLanguages`, `usePreferredReducedTransparency`) earns code.
    Everything else on that feature is `svelte-native` and is in recipes.
  - `feat-019` scroll & mouse — `useScroll`, `useScrollLock`,
    `useInfiniteScroll`, `useMouse`, `useMouseInElement`, `useMousePressed`.
  - `feat-021` keyboard — `onKeyStroke`, `useMagicKeys`, `onStartTyping`.
  - `feat-022` — `useColorMode`, `useCssVar`, `useTextareaAutosize`.
  - `feat-017` elements — `useElementVisibility` (T1) + `useElementBounding`,
    `useElementHover`, `useFocus`, `useFocusWithin`, `useMutationObserver` (T2).
- `feat-015` (async + history) is tier **`niche`** — deliberately last, not
  next. `feat-012` is `useTimeAgo` only, tier T2.
- `feat-031` is the extras feature (`Selection`, `useControllableState`,
  `useHotkeys`, `usePagination`). **Some of these have Base UI equivalents
  already written in Svelte and are meant to be ported from there, not written
  fresh** — which ones is still an open question for the maintainer. Do not
  start it without that answer. Note it is `feat-031`, **not** `feat-030`;
  `feat-030` belongs to the integrations package.
- `useNow` / `useTimestamp` / `useTimeAgo` are `todo` again (tier T2) after
  being cut/deferred earlier.

## Timing core — how feat-011 is built (do not re-derive)

- **Nothing here is delegated.** `svelte/reactivity` has no timer primitive, so
  all five utils are hand-rolled.
- **Every timer is armed inside `$effect`.** That single decision covers both
  requirements: SSR-safe (effects never run on the server, so no server-side
  timer holds the process open) and leak-free (the effect teardown clears the
  timer / cancels the pending frame on unmount). No `tryOnScopeDispose` needed.
- `useIntervalFn` watches a getter `interval` in a **second `$effect` with no
  cleanup** — folding it into the lifecycle effect would let unmount be misread
  as a stop request.
- `useCountdown` takes a `scheduler` factory rather than hard-coding
  `setInterval`, so its logic holds no real timer and tests can step it directly.
- `useFps` samples on `performance.now()`, not the rAF timestamp (matches
  VueUse; backgrounded tabs throttle frames).

## Smooth scroll — how feat-002's `useSmoothScroll` is built (do not re-derive)

- **The factory shape is deliberate.** `smoothScrollTo(0)` as a plain function
  would need module-scope state to supersede-cancel overlapping calls, which
  `scope.md` §2 forbids. The container is bound at init, so all per-run state
  (generation id, effect-root handle, interrupt listeners) stays in the closure.
- **A superseding run must not touch shared state.** `runId` is bumped by
  `cancel()` _and_ by each new call; the `finally` block only settles `scrolling`
  and tears down when `id === runId`.
- **The tween is written from an `$effect.root` scoped to the run**, not from a
  permanently-running `$effect` — otherwise it would fight the user's own
  scrolling forever. The root is stopped on settle, on cancel, and on unmount.
- **`keydown` is intentionally not filtered** in `INTERRUPT_EVENTS`: keys with no
  scrolling effect cancel harmlessly, and filtering trades a rare abort for a
  missed interrupt.
- **Element targets resolve against the container, not the viewport**
  (`rect.top` rebased by the container's rect and `scrollTop`) so they land
  correctly inside a scrolled frame.
- **`prefersReducedMotion` is imported from `svelte/motion`**, not
  `svelte/reactivity/media-query` — 5.57.1 has no such export, and there is no
  named `prefersReducedMotion` in `svelte/reactivity` either.
- The `isBrowser` guard at the top of `scrollTo` means oxlint's
  `no-unnecessary-condition` will flag any second browser check inside the same
  function. That is correct narrowing, not a false positive.

## State essentials — how feat-009 is built (do not re-derive)

- **Three type problems cost most of the time here. All three are solved without
  a cast or a lint suppression; keep it that way.**
- **`useToggle`**: never assign a literal into the generic slot. Pass the two
  values to a private `valuesToggle()` as _arguments_ so `T` is inferred as
  `boolean` on the boolean overload. The boolean overload takes no options.
- **`toggle()` vs `toggle(undefined)` differ, and a default parameter cannot
  express that.** The arity is the signal, carried by a rest parameter typed
  `...args: [] | [T]`. Do not go back to `arguments.length` (legacy style) or to
  an optional parameter (loses the distinction). `Object.is` drives the compare.
- **`structuredClone` cannot read a reactive proxy** (`DOMException`), and
  `$state.raw` does not de-proxy. Only `$state.snapshot` works, so the default
  clone is `structuredClone($state.snapshot(source))`.
- **Svelte exports neither `Snapshot` nor `snapshot`,** so the type is named with
  `ReturnType<typeof defaultClone<T>>` (an instantiation expression). A
  hand-written conditional alias is rejected — TS cannot prove it matches
  Svelte's for a deferred `T`.
- **`usePrevious` needs a non-reactive `last`** holding the previous effect run's
  value. Reading the source inside the effect gives you the _current_ value, not
  the prior one; that bug shipped in the first draft and the tests caught it.
- **`noUncheckedIndexedAccess` is on,** so `list[i]` is `T | undefined`.
  `useCycleList` uses `list[wrapped]!` because the wraparound arithmetic already
  proves the index is in range.
- **`useStepper` works in `unknown` space** on purpose, so array steps (names are
  the values) and record steps (names are the keys) share one path — and the impl
  signature declares the widened return, which is why even the final return needs
  no cast.

## `until` and `refAutoReset` (the two survivors of feat-013 / feat-014)

- **`until` is called during component init (or inside `$effect.root`);** it
  constructs a `$effect`. On the server the effect is inert, so an
  already-matching matcher resolves synchronously while a waiting one cannot.
- **`until` is cast-free by construction:** the impl returns
  `UntilValueInstance<T> | UntilArrayInstance<T>` and `createArrayUntil` narrows
  with `Array.isArray` inside `toContains` — no `as unknown as` dispatch.
- **`until` is deliberately kept** while its sibling watchers were removed: Svelte
  has no await-a-reactive-condition primitive, so no Svelte-native replacement
  exists. That is the test every removed util had to fail.
- **`refAutoReset` arms its timer only when `isBrowser`.** On the server `$effect`
  is inert, so the unmount cleanup never runs and a stray timer could outlive the
  render. The value still stores; only `setTimeout` is skipped.
- **A util with no runes ships a single `index.ts`** (`module-contract.md` §1:
  pure logic stays compiler-free).
- **`method-signature-style` is enforced on exported interfaces** — use property
  function types (`stop: () => void`), not methods. `unicorn/no-new-array` bans
  `new Array(n)`; use `.map(() => false)`. `unbound-method` bans passing a
  method reference unbound — wrap forwarded controls in arrows.

## Harness Notes (learned this session — do not rediscover)

- **`perfectionist/sort-interfaces` orders `trigger` before `value`**, and
  `perfectionist/sort-object-types` orders `set` before `get`. Run `lint:fix`
  before `format:fix`; the autofix reorders code and leaves formatting to `oxfmt`.
- **PowerShell `ConvertTo-Json` / `Set-Content` corrupts `feature_list.json`**
  (mangles indentation and backslash escapes). Rewrite it with a `node -e` script
  that does `JSON.parse` → mutate → `JSON.stringify(_, null, 2)`. Verified with a
  differential script: every recipe name must appear in `docs/recipes.md` and no
  shipped util may appear there.
- Svelte's `Tween` reads `performance.now()` internally, so `test/fixtures/raf.ts`
  cannot drive it. Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()`.
- `typescript/no-unsafe-type-assertion` is set to `error` with no options, and
  `unknown as T` is rejected for _any_ generic target. A typed deserializer
  therefore cannot cast its way out — `.agents/rules/typescript.md` prescribes
  a runtime type guard instead, which is how `useStorage`'s serializer is built.
- `$effect` cleanup must be callable, not `undefined`: a bare early `return;`
  trips `consistent-return`. Return a no-op function instead.
- The sv-utils reference casts to generics freely (`lastArgs as Args`,
  `JSON.parse(raw) as T`). Both are unreachable here — `no-unsafe-type-assertion`
  rejects any assertion whose target is a generic type parameter. Narrow with a
  runtime guard or a `value is T` predicate instead.
- In the `node` test environment `svelte` resolves to its **server** build: runes
  are inert and `$effect.root` never calls back. SSR probes must call the factory
  directly, never inside an effect root or `mount()`.
- **`peerDependencies.svelte` is `^5.11.0`.** `svelte/reactivity` needs 5.7.0+,
  `svelte/reactivity/window` needs 5.11.0+. A subpath import fails at _build_
  time, not install time, so this range is the only guard — never lower it.
- `svelte/reactivity` resolves SSR identity stubs via `worker`/`browser`/`default`
  conditions (`SvelteMap` → `globalThis.Map`, `createSubscriber` → no-op,
  `MediaQuery` → stub). Only `new MediaQuery(...)` needs an `isBrowser` guard.
- `useDark` uses `MediaQuery` deliberately. Do not "simplify" it back to
  `window.matchMedia` inside a `useEventListener` getter — a getter re-resolves
  every effect run, so that rebuilt the `MediaQueryList` and rebound each time.
  Full rationale in `.agents/rules/scope.md` §5.4.
- `WorkerGlobalScope` is unreachable under this package's DOM lib, and neither
  `globalThis as { WorkerGlobalScope }` nor a type-guard on `globalThis` itself
  satisfies the linter (TS does not narrow a _global identifier_). Pass it into
  a guard **function** and narrow the parameter instead — see
  `workerScopeOf()` in `src/lib/shared/is.ts`.
- `vi.spyOn(navigator, 'maxTouchPoints', 'get')` throws in jsdom: `Navigator`
  omits the property entirely. Use `Object.defineProperty` for it (and for
  `userAgent`), then restore the original descriptors.
- **`oxlint`'s `no-unnecessary-condition` flagged VueUse's `if (isActive)`
  re-check in `useIntervalFn`** as always-truthy. It is not: a user callback can
  call `pause()`. Do not suppress it — `resume()` arms the interval _before_
  invoking `immediateCallback`, so a nested `pause()` clears the timer and the
  branch disappears. Check whether the same collapse is possible before adding a
  suppression.
- **VueUse's `useTimeoutFn` uses `AnyFn` (`(...args: any[]) => any`) and a
  `(...args: Args | [])` signature** only so its no-argument immediate edge
  typechecks. Neither works under this package's zero-`any` rules. Route
  mount-driven arming through an `arm(fire: () => void)` helper instead of
  widening the public signature — `Args | []` breaks `cb(...args)` on the
  delayed edge.
- `$effect` cannot be used in a `*.test.ts` file (rune-outside-svelte), and
  `mountUtil` throws when setup returns `undefined`. Read runes through
  `test/fixtures/*.svelte.ts` instead; do not try to inline an effect.
- **`bun run format` fails hard on any invalid UTF-8 byte in a scanned file**
  (`oxfmt` reports "binary or inaccessible" and stops). A single mangled em dash
  in `session-handoff.md` blocked formatting for every session until repaired.
  If `oxfmt` names one file, scan it for U+FFFD and fix that file only.
- **A symbol exported from two barrel paths is dropped silently** by
  `svelte-package`/rollup, and `svelte-check` will not see it. After touching
  `src/lib/index.ts`, verify the public surface with a throwaway type-level guard
  (`type Missing = Exclude<Required, keyof typeof barrel>`, assert `never`), then
  delete it. Do not trust the barrel by eye.
- **Tests are excluded from `svelte-check` and lint on purpose**
  (`shared-ignore.config.ts`, tsconfig `exclude`), so a type error written in a
  `*.test.ts` is never reported. Tests are specification, not shipped surface;
  their correctness is pinned by vitest at runtime only.
- **`svelte(prefer-svelte-reactivity)` forbids bare `new Set`/`new Map`.** Use
  `SvelteSet`/`SvelteMap` from `svelte/reactivity`; on the server they are the
  native collections, so SSR behaviour is unchanged.
- **Overloaded third arguments can be dispatched with zero casts.** Declare the
  implementation parameter as the _union_ of the accepted shapes, then narrow
  with `typeof x === 'function'` and a hand-written `x is Options` guard. Do
  **not** use `isObject` for that guard: its `Record<PropertyKey, unknown>`
  predicate intersects the union into `'{} | null'` and the comparator stops
  typechecking.
- **A single-generic implementation signature can satisfy two public overloads**
  whose type relationship TS cannot express. Keep both overloads on the public
  function; the shared body may collapse to one generic with no assertion.
- `unicorn/no-array-sort` requires `toSorted`; `unicorn/consistent-function-scoping`
  requires module-scope helpers. Both are fixable honestly, no suppressions.

## How to Resume

1. Read `packages/svelte-use/AGENTS.md` and `packages/svelte-use/.agents/rules/`.
2. Run `.\init.ps1` to ensure all gates pass.
3. Read `feature_list.json`, sort the `todo` features by `tier`, take the first.

## Blockers

- **One open question for the maintainer:** which `feat-031` extras should be
  ported from Base UI rather than written fresh. Everything else is unblocked.

## Files

- `packages/svelte-use/AGENTS.md` — canonical harness.
- `packages/svelte-use/feature_list.json` — implement-only roadmap.
- `packages/svelte-use/docs/recipes.md` — all 95 not-ported hooks + replacements.
- `packages/svelte-use/progress.md` — session log.

## Next Session

- **Last Updated**: 2026-10-02
- **Current Objective**: scope re-curation is done and green; next is
  `feat-016` (Tier 1, `useBreakpoints` et al), then `feat-019` / `feat-021` /
  `feat-022` / `feat-017`. `feat-015` is tier `niche` and deliberately last.
- **Recommended Next Step**: run `.\init.ps1` (or `./init.sh`) from
  `packages/svelte-use/`, then take the lowest-id Tier 1 feature.
