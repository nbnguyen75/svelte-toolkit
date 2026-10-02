# Session Handoff — svelte-use

## Current State

- Harness and tooling configured in `packages/svelte-use/` (see `progress.md`).
- `feat-001` through `feat-009` and `feat-011` are `done` (gates green 2026-10-02).
- Pure library package (no SvelteKit shell). Shipped utils:
  `useScrollToTop`, `useEventListener`, `useDark`, `useClipboard` (browser),
  `useStorage`/`useLocalStorage`/`useSessionStorage` plus `useToggle`/`useCounter`/`usePrevious`/`useLastChanged`/`useCloned`/`useCycleList`/`useStepper`/`useOffsetPagination` (state),
  `useDebounceFn`/`useThrottleFn`/`useTimeoutFn`/`useIntervalFn`/`useCountdown`/
  `useRafFn`/`useFps` (utilities), plus shared `is.ts` (14 guard/predicate
  exports) / `getter.ts`. Barrel exports 37 symbols. Suite: 266 tests / 42 files.
- `feature_list.json` work queue: `cut`/`deferred`/`svelte-native` entries encode
  scope decisions (see `scope.md`, `docs/recipes.md`).

## Immediate Next Task

- **feat-001 through feat-008 and feat-011 are `done`** (gates green 2026-10-01).
- **feat-009 State essentials is `done`** - `useToggle`, `useCounter`, `usePrevious`, `useLastChanged`, `useCloned`, `useCycleList`, `useStepper`, `useOffsetPagination` (gates green 2026-10-02).
- **Next unblocked feature is feat-010 Reactive arrays** - `useArrayMap`, `useArrayFilter`, `useArrayUnique`, and friends. Deps (feat-005, feat-008) are done. Pure transforms, `shared/` category, no compiler needed.
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

## How to Resume

1. Read `packages/svelte-use/AGENTS.md` and `packages/svelte-use/.agents/rules/`.
2. Run `.\init.ps1` to ensure all gates pass.
3. Check `feature_list.json` for the next unfinished utility.

## Blockers

- None — baseline verification not run yet in this repo.

## Files

- `packages/svelte-use/AGENTS.md` — canonical harness.
- `packages/svelte-use/feature_list.json` — roadmap and work queue.
- `packages/svelte-use/progress.md` — session log.

## Next Session

- **Last Updated**: 2026-10-01
- **Current Objective**: baseline verification, then first utility port.
- **Recommended Next Step**: run `.\init.ps1` (or `./init.sh`) from `packages/svelte-use/`.

## State essentials � how feat-009 is built (do not re-derive)

- **Three type problems cost most of the time here. All three are solved without
  a cast or a lint suppression; keep it that way.**
- **`useToggle`**: never assign a literal into the generic slot. Pass the two
  values to a private `valuesToggle()` as *arguments* so `T` is inferred as
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
  hand-written conditional alias is rejected � TS cannot prove it matches
  Svelte's for a deferred `T`.
- **`usePrevious` needs a non-reactive `last`** holding the previous effect run's
  value. Reading the source inside the effect gives you the *current* value, not
  the prior one; that bug shipped in the first draft and the tests caught it.
- **`noUncheckedIndexedAccess` is on,** so `list[i]` is `T | undefined`.
  `useCycleList` uses `list[wrapped]!` because the wraparound arithmetic already
  proves the index is in range.
- **`useStepper` works in `unknown` space** on purpose, so array steps (names are
  the values) and record steps (names are the keys) share one path � and the impl
  signature declares the widened return, which is why even the final return needs
  no cast.