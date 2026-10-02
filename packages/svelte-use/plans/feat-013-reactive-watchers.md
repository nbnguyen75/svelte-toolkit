# Plan — feat-013 Reactive watchers

Status: ready for execution
Baseline commit: 37e5947 (`feat(svelte-use): add reactive array utils (feat-010)`)
Gate: `bun run check && bun run format && bun run lint && bun run test && bun run prepack`

## Why this plan exists

`batch-workflow.md` §1 requires an `improve` plan before any batch with 8+ function
entries. feat-013 has 13 entries. This plan fixes the per-function status and the
Svelte-5 API shape so implementation is mechanical and does not re-litigate the
Vue→Svelte semantic gap.

## The gap this plan closes

Vue's `watch` has no Svelte 5 equivalent. `$effect` is the substrate: it runs on
mount, re-runs when tracked state changes, and returns a teardown. It does **not**
supply old values, an `immediate` flag, `flush`, `deep`, `once`, `onTrack`/`onTrigger`,
`onCleanup`, or a stop handle. Every port below adds the missing piece explicitly and
documents the divergence. `$state` proxies already track nested reads, so Vue's `deep`
has no meaning here.

Svelte-idiomatic port source (reference, contains `as` casts this package forbids):
`../../../sv-utils/packages/src/lib/state/{until,watchArray,watchAtMost,watchIgnorable,watchTriggerable}`.
VueUse behavior spec: `../../vueuse/packages/shared/{...}` (resolve via `$VUEUSE_SRC`).
The reference repo is external and must never be referenced by absolute path in
committed files.

## Per-function status

**`cut` → recipes** (already documented in `docs/recipes.md` "Watchers" row; flip
`function.status` from `todo` to `cut`, keep the row). Each is a 1–3 line `$effect`:

| Function          | Reason                                                    |
| ----------------- | --------------------------------------------------------- |
| `watchOnce`       | `$effect` + a `done` flag; fits on screen.                |
| `watchImmediate`  | `$effect` already runs on mount.                          |
| `watchDeep`       | `$state` proxies track nested reads; nothing to add.      |
| `whenever`        | `$effect` + `if (value)`.                                 |
| `watchDebounced`  | `$effect` + kept `useDebounceFn`.                         |
| `watchThrottled`  | `$effect` + kept `useThrottleFn`.                         |
| `watchPausable`   | `$effect` + an `active` flag.                             |
| `watchWithFilter` | `$effect` + the kept filter fns; no extra option surface. |

**`done` → library code** (5): `watchAtMost`, `watchArray`, `until`,
`watchIgnorable`, `watchTriggerable`. Each owns non-trivial state (handles: stop,
pause/resume, ignore controls, manual trigger, promise settling) per `scope.md` §3.

## Shared API rules (all 5 modules)

- Input: `MaybeGetter<T> = T | (() => T)`, reused from `src/lib/shared/getter.ts`.
  No Vue `WatchSource`/multi-source arrays — Vue-specific; a recipe composes them.
- Callback: `(value: T, oldValue: T | undefined, onCleanup: (fn) => void) => R`.
- Options are a flat `{ immediate?: boolean }` (plus `until`'s `{ timeout, throwOnTimeout }`
  and `watchAtMost`'s `{ count }`). No `flush`/`deep`/`once`/`onTrack`/`onTrigger`.
- Return a stop handle (`() => void`) or a getter-backed handle object
  (`module-contract.md` §4). Never a Vue `WatchHandle`.
- **Zero `as`/`!`/`any`.** `watchTriggerable.trigger()` gets its result by making
  `ignoreUpdates` generic (`<R>(updater: () => R) => R`) instead of casting.
- Effects must still **track** the source (read `resolveGetter(source)` outside
  `untrack`) but the callback body runs inside `untrack` so user writes inside it
  do not re-trigger the effect.
- Every `$effect` returns a teardown that runs the pending user cleanup, so unmount
  is leak-free (stronger than the reference, which only cleans on explicit `stop()`).
- SSR: on the server `$effect` is inert (`useLastChanged.ssr.test.ts` proves calling
  it in `node` is a no-op, not a throw). `until` still runs its synchronous
  "already matching" check, so a matching `until(...)` resolves on the server; a
  non-matching one cannot settle there — document this.

## Per-module specs

### `watchIgnorable` (state/watchIgnorable)

Exports: `IgnoredUpdater` (generic), `WatchIgnorableOptions { immediate }`,
`WatchIgnorableReturn { ignoreUpdates, ignorePrevAsyncUpdates, stop }`, `watchIgnorable`.
Behavior: normal fire with `(value, oldValue)`; `ignoreUpdates(fn)` runs `fn` and
drops exactly the next fire; `ignorePrevAsyncUpdates()` drops the next fire (our
batched-effect equivalent of VueUse's async-flush counter — document the divergence);
`stop()` halts and runs pending cleanup; `immediate` fires once with `oldValue`
undefined. `Object.is` guards no-op writes.

### `watchTriggerable` (state/watchTriggerable)

Exports: `WatchTriggerableCallback`, `WatchTriggerableOptions`, `WatchTriggerableReturn<R>`
(`extends WatchIgnorableReturn` + `trigger(): R`), `watchTriggerable`.
Behavior: built on `watchIgnorable`; each fire runs the previous cleanup then the
callback; `trigger()` runs the callback now with `(currentValue, undefined)` and
returns its result (via the generic `ignoreUpdates`), without a duplicate fire.

### `watchAtMost` (state/watchAtMost)

Exports: `WatchAtMostOptions { count: MaybeGetter<number>; immediate? }`,
`WatchAtMostReturn { calls, pause, resume, stop }`, `watchAtMost`.
Behavior: fires up to `count` times then auto-stops; `calls` is getter-backed;
`pause()` drops changes without catch-up (updates `lastSeen` silently); `resume()`
continues from the latest value; returned `stop` is permanent.

### `watchArray` (state/watchArray)

Exports: `WatchArrayCallback<T>`, `WatchArrayOptions { immediate }`, `watchArray`
returning a stop `() => void`.
Behavior: identity diff with duplicate-safe matching (each old item consumed once);
`added`/`removed` in encounter order; `immediate` fires with `oldValue`/`removed`
empty and `added` = all items; cleanup runs before each callback and on stop.

### `until` (state/until)

Exports: `UntilOptions { timeout?; throwOnTimeout? }`, `UntilBaseInstance<T>`,
`UntilValueInstance<T>`, `UntilArrayInstance<T>`, `until`.
Behavior: `toMatch(condition)` / `changed()` / `changedTimes(n)` on all instances;
value-only `toBe(MaybeGetter)` / `toBeTruthy` / `toBeNull` / `toBeUndefined` /
`toBeNaN`; array-only `toContains(MaybeGetter)`; `.not` inverts. Resolves on the
first matching value; the mount run subscribes without evaluating (the synchronous
check covers the already-matching case) so counting matchers evaluate once per
change. `timeout>0` settles with the current value, or rejects when
`throwOnTimeout`. `toBe` tracks a getter target by reading it inside the effect.
Cast-free: constrain `createArrayUntil<T extends unknown[]>` and use
`Array.isArray(snapshot)` inside `toContains`; dispatch in `until` with an
`unknown`-typed implementation signature (no `as`) — verify `bun run check`.

## Tests (per test-contract.md)

Per module: `<name>.test.ts` (`// @vitest-environment jsdom`, `createBox` +
`mountUtil`, `await tick()`) and `<name>.ssr.test.ts` (node). Port the reference
suites' cases plus: teardown-on-unmount runs pending cleanup; `watchAtMost` reactive
`count`; `until` timeout / throwOnTimeout / `not` / getter target; no-op writes do
not fire; instances are independent. Assert cleanup via an order log.

## Boundaries

In scope: the 5 modules above, their barrel lines, `feature_list.json` statuses,
`progress.md`, `session-handoff.md`. Out of scope: the 8 cut functions (recipes
already exist), `docs/recipes.md` (row already present), any other batch.

## Escape hatches

- If `bun run check` rejects the `unknown`-typed `until` implementation signature,
  STOP and report — do not add an `as`.
- If a `$effect` teardown turns out to double-fire a user cleanup, fall back to the
  reference's explicit-only cleanup and document the unmount gap.
- If `until` cannot be constructed outside component init, keep the reference's
  constraint and document it; do not attempt `$effect.root` (SSR-unsafe).
