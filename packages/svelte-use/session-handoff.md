# Session Handoff — svelte-use

## Current State

- Harness and tooling configured in `packages/svelte-use/` (see `progress.md`).
- `feat-001` through `feat-011` and `feat-013` are `done`; `feat-012` is
  `deferred` (gates green 2026-10-02).
- Pure library package (no SvelteKit shell). Shipped utils:
  `useScrollToTop`, `useEventListener`, `useDark`, `useClipboard` (browser),
  `useStorage`/`useLocalStorage`/`useSessionStorage` plus `useToggle`/`useCounter`/`usePrevious`/`useLastChanged`/`useCloned`/`useCycleList`/`useStepper`/`useOffsetPagination` (state),
  the watchers `watchIgnorable`/`watchTriggerable`/`watchAtMost`/`watchArray`/
  `until` (state),
  `useDebounceFn`/`useThrottleFn`/`useTimeoutFn`/`useIntervalFn`/`useCountdown`/
  `useRafFn`/`useFps` (utilities), the 13 reactive array transforms
  `useArrayMap`/`useArrayFilter`/`useArrayUnique`/`useArraySome`/`useArrayEvery`/
  `useArrayIncludes`/`useArrayJoin`/`useArrayReduce`/`useArrayFind`/
  `useArrayFindIndex`/`useArrayFindLast`/`useArrayDifference`/`useSorted` (shared),
  plus shared `is.ts` (14 guard/predicate exports) / `getter.ts`.
  Barrel exports 55 runtime symbols. Suite: 469 tests / 78 files.
- `feature_list.json` work queue: `cut`/`deferred`/`svelte-native` entries encode
  scope decisions (see `scope.md`, `docs/recipes.md`).

## Immediate Next Task

- **feat-013 Reactive watchers is `done`** — the 5 kept watchers listed above; the 8 one-liners are `cut` as recipes in `docs/recipes.md` (gates green 2026-10-02); details below.
- **Next unblocked coding feature is feat-014** (ref variants). feat-012 Date/time display is `deferred` (date-fns recipes only, no code).
- `feat-015` onward (async/history) are also unblocked; take them in id order unless the roadmap says otherwise.
- `useTimeout`, `useInterval`, `useNow`, `useTimestamp` are `cut` — they are
  recipes in `docs/recipes.md`, not library code.

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

## Harness Notes (learned this session — do not rediscover)

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
  whose type relationship TS cannot express (e.g. `useArrayReduce`'s seeded vs
  no-seed accumulator). Keep both overloads on the public function; the shared
  body may collapse to one generic with no assertion.
- **`Number(a) - Number(b)` is a cast-free generic numeric comparator** — it is
  the same `ToNumber` conversion the `-` operator performs, so numeric strings
  still compare numerically and the function assigns to a generic compare type.
- **V8 does not throw on a `NaN` comparator in `Array#sort`** — it just leaves
  the order unspecified. Do not write error-path tests that assume a throw.
- `unicorn/no-array-sort` requires `toSorted`; `unicorn/consistent-function-scoping`
  requires module-scope helpers. Both are fixable honestly, no suppressions.

## How to Resume

1. Read `packages/svelte-use/AGENTS.md` and `packages/svelte-use/.agents/rules/`.
2. Run `.\init.ps1` to ensure all gates pass.
3. Check `feature_list.json` for the next unfinished utility.

## Blockers

- None. Baseline (`.\init.ps1`) is green as of 2026-10-02.

## Files

- `packages/svelte-use/AGENTS.md` — canonical harness.
- `packages/svelte-use/feature_list.json` — roadmap and work queue.
- `packages/svelte-use/progress.md` — session log.

## Next Session

- **Last Updated**: 2026-10-02
- **Current Objective**: start feat-014 (ref variants) — feat-012 is deferred to date-fns recipes.
- **Recommended Next Step**: run `.\init.ps1` (or `./init.sh`) from `packages/svelte-use/`, then read `feature_list.json` for feat-014's function list.

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

## Reactive arrays — how feat-010 is built (do not re-derive)

- **The batch is a thin reactive shell over native array methods.** Twelve of the
  thirteen are one `$derived`; the work was in the overload types, not algorithms.
- **`useArrayIncludes` / `useArrayDifference` / `useSorted` accept a comparator, a
  `keyof T` key, or an options bag as the third argument.** The implementation
  signature declares that parameter as the _union_ of the three shapes and
  narrows with `typeof === 'function'` plus a hand-written `isOptions` guard.
  Never reach for `isObject` here — its `Record<PropertyKey, unknown>` predicate
  intersects the union into `'{} | null'` and breaks the comparator.
- **`useArrayReduce` is two public overloads over one single-generic body.**
  Native `reduce` ties the accumulator to the element type only on the no-seed
  path; TS cannot express that across an overload boundary, so the shared
  implementation is `<T>` and both paths call native `reduce` directly.
- **`useSorted`'s default is `Number(a) - Number(b)`**, not a cast. It performs
  the same `ToNumber` the `-` operator does, so numeric strings sort numerically
  and the function assigns to `UseSortedCompareFn<T>` with no assertion.
- **`useArrayFindLast` uses native `findLast`; `useArrayUnique`'s default uses
  `SvelteSet`.** Both replaced hand-rolled loops in the reference. `Set` applies
  `SameValueZero`, so `0` and `-0` collapse (the reference's `Object.is` loop
  contradicted its own comment) and `NaN` self-matches — tests pin this.
- **`useSorted` `dirty` mode is client-only by construction** (it registers an
  `$effect` that splices the source only when the order actually changed, which
  is what makes it settle). Copy mode is pure and is what the SSR probe covers.
  `defaultSort` uses `toSorted`; the caller's array is never mutated.
- **`useArrayIncludes` defaults to SameValueZero** (like native `includes`); key
  comparison uses `Object.is`; `fromIndex` slices the list before `.some`.

## Reactive watchers — how feat-013 is built (do not re-derive)

- **Svelte has no `watch`; every watcher wraps `$effect` + `untrack`.** Vue's
  `flush`/`deep`/`once`/multi-source arrays and `WatchHandle` do not exist here.
  Public shape is `MaybeGetter<T>` source plus a `(value, oldValue, onCleanup)`
  callback; `deep` is meaningless because `$state` proxies track nested reads.
- **`watchIgnorable` syncs `lastSeen` synchronously inside `ignoreUpdates`,** not a
  boolean skip flag. Svelte batches effects, so a flag set around a no-op or
  same-value write would stay armed and swallow the _next_ real change. Setting
  `lastSeen = resolveGetter(source)` after the updater is the fix. Keep it.
- **`ignoreUpdates` is generic (`<R>(updater) => R`) so `watchTriggerable.trigger`
  returns the callback result with no `as R`.** The reference needed the cast
  because its updater returned `void`.
- **Every `$effect` returns a teardown, so unmount flushes the pending cleanup.**
  The reference only cleaned on explicit `stop()`. `watchTriggerable` gets one
  dedicated teardown `$effect` because its `watchIgnorable` receives a wrapper
  that owns no cleanup.
- **`until` must be called during component init (or inside `$effect.root`);** it
  constructs a `$effect`. On the server the effect is inert, so an
  already-matching matcher resolves synchronously while a waiting one cannot.
- **`until` is cast-free by construction:** the impl returns
  `UntilValueInstance<T> | UntilArrayInstance<T>` and `createArrayUntil` narrows
  with `Array.isArray` inside `toContains` — no `as unknown as` dispatch.
- **The 8 one-liner watchers are `cut`, not stubs** (`watchOnce`,
  `watchImmediate`, `watchDeep`, `whenever`, `watchDebounced`, `watchThrottled`,
  `watchPausable`, `watchWithFilter`) — plain `$effect` covers them; see
  `docs/recipes.md`. Do not add them as library code.
- **`method-signature-style` is enforced on exported interfaces** — use property
  function types (`stop: () => void`), not methods. `unicorn/no-new-array` bans
  `new Array(n)`; use `.map(() => false)`. `unbound-method` bans passing a
  method reference unbound — wrap forwarded controls in arrows.
