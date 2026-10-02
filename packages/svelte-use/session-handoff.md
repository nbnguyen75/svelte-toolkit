# Session Handoff — svelte-use

## Current State

- Harness and tooling configured in `packages/svelte-use/` (see `progress.md`).
- `feat-001` through `feat-004` are `done` (gates green 2026-10-01).
- Pure library package (no SvelteKit shell). Shipped utils:
  `useScrollToTop`, `useEventListener`, `useDark`, `useClipboard` (browser),
  `useStorage`/`useLocalStorage`/`useSessionStorage` (state),
  `useDebounceFn`/`useThrottleFn` (utilities), plus shared `is.ts`/`getter.ts`.
  Barrel exports 11 symbols.
- `feature_list.json` work queue: `cut`/`deferred`/`svelte-native` entries encode
  scope decisions (see `scope.md`, `docs/recipes.md`).

## Immediate Next Task

- **feat-005 (Test & docs harness) is already satisfied** — verify, flip to
  `done`, record evidence. Same for **feat-006** (satisfied by commit `fbe6720`)
  and **feat-008** (both known fixes already applied: `useClipboard` timer
  disposal, `useScrollToTop` cancel handle + generation guard). Remaining real
  work is **feat-007** (`is.ts` expansion to VueUse parity).
- `useCountdown` etc. live in **feat-011**, not feat-004, and feat-011 depends on
  feat-008. Full order: `feat-005 → feat-006/007 → feat-008 → feat-011`.
- **feat-011 must be hand-rolled.** `svelte/reactivity` exports 7 symbols and
  **none is a timer** — there is no interval/timeout/raf/countdown primitive.
  `useTimeoutFn` → `useIntervalFn` → `useCountdown` → `useRafFn` → `useFps`.

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
