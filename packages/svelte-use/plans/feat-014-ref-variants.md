# Plan — feat-014 Ref variants & shared state

Status: ready for execution
Baseline commit: 9bbc45a (`feat(svelte-use): add reactive watchers (feat-013)`)
Gate: `bun run check && bun run format && bun run lint && bun run test && bun run prepack`

## Why this plan exists

feat-014 started with 13 function entries. Re-checked against `scope.md` §3, eight
were kept; this plan cuts five more as recipes and leaves **three** modules with
real state/lifecycle/options. Its job is to fix the per-function status and the
Svelte-5 API shape so implementation is mechanical.

## Per-function status

**`cut` → recipes** (flip `function.status` from `todo` to `cut`; the row is
already in `docs/recipes.md`):

| Function            | Reason (fails §3)                                                               |
| ------------------- | ------------------------------------------------------------------------------- |
| `refManualReset`    | `$state` + `reset()` + `isDirty` derived — fits on screen.                      |
| `refWithControl`    | A `$state` cell plus a setter; `untrackedGet` is native `untrack`.              |
| `createEventHook`   | Set-based emitter; Svelte callback props supersede it, and no util consumes it. |
| `createGlobalState` | A lazy memo; §2 already tells users to write a factory or use context.          |
| `syncRef`           | Fragile microtask loop-breaker + `as unknown as` casts; `syncRefs` already cut. |

**`done` → library code** (3): `refAutoReset`, `computedWithControl`,
`createSharedComposable`. Each owns something a template cannot express: a timer
lifecycle, a controlled memo with overloads + manual trigger, and an SSR-branched
shared singleton (`scope.md` §2 names it explicitly).

## Shared API rules (all 3 modules)

- **Zero `as`/`!`/`any`.** Reuse `MaybeGetter`/`resolveGetter` from
  `src/lib/shared/getter.ts`. Where the reference needed a cast, use a wrapper
  object (`{ value: T }`) or a `has`/`undefined` pair instead.
- Return getter-backed handles (`module-contract.md` §4) — never a Vue `Ref`.
- Any timer is cleared on owner unmount via `$effect(() => () => cleanup())`.
- SSR: `$effect` is inert, so client-only work must be guarded with `isBrowser`
  (from `src/lib/shared/is.ts`) and documented per module.

## Per-module specs

### `refAutoReset` (state/refAutoReset)

Exports: `RefAutoResetReturn<T>`, `refAutoReset`.
Signature: `refAutoReset<T>(defaultValue: MaybeGetter<T>, afterMs: MaybeGetter<number> = 10000): RefAutoResetReturn<T>`.
Behavior: a `$state<T>` seeded from `resolveGetter(defaultValue)` with a
`value` getter/setter. Every write stores the value, clears any pending timer, and
re-arms a `setTimeout` that restores `resolveGetter(defaultValue)` (matching
VueUse: re-arm on every set, even same-value). Getter `defaultValue`/`afterMs`
re-resolve per write/reset. Timer is cleared on unmount. Guard the timer with
`isBrowser` so an SSR write cannot schedule a stray timeout.

### `computedWithControl` (state/computedWithControl)

Exports: `ComputedWithControlReturn<T>`, `WritableComputedWithControlReturn<T>`,
`computedWithControl` (two overloads).
Signature: `(source: MaybeGetter<unknown>, fn: () => T)` → read-only;
`(source, { get(): T; set(v: T): void })` → writable.
Behavior: `$state` `epoch`; an `$effect` tracks `source` and bumps `epoch` in
`untrack`. `current()` tracks `epoch`, recomputes `read()` untracked, and caches
keyed by revision. `trigger()` bumps `epoch`. Cache as `{ value: T } | undefined`
so a legitimately-`undefined` `T` neither breaks the cache nor needs a cast. Wrap
`fn.get`/`fn.set` in arrows (no `unbound-method`).

### `createSharedComposable` (state/createSharedComposable)

Exports: `createSharedComposable`.
Signature: `createSharedComposable<Args extends unknown[], R>(composable: (...args: Args) => R): (...args: Args) => R`.
Behavior: on the server return `composable` unchanged (fresh per request); on the
client memoize the first result in a `{ value: R } | undefined` closure cell so an
undefined-returning composable is still cached once. Document the ceiling: it is a
client singleton with **no refcount/dispose** (unlike Vue's `effectScope`); use
Svelte context when per-subtree sharing or teardown is needed.

## Tests (per test-contract.md)

Per module: `<name>.test.ts` (`// @vitest-environment jsdom`, `createBox` +
`mountUtil`, `await tick()`) and `<name>.ssr.test.ts` (node). Required cases:

- `refAutoReset`: `vi.useFakeTimers()`; resets after `afterMs`; each write
  re-arms; getter `defaultValue`/`afterMs` re-resolve; unmount clears the timer
  (no reset after unmount); SSR write does not schedule/throw.
- `computedWithControl`: recomputes when `source` changes; `trigger()` forces a
  recompute; result is cached between recomputes (assert `fn` call count);
  writable overload routes `value =` through `set`; SSR computes on read.
- `createSharedComposable`: two client calls return the same instance; SSR calls
  return distinct instances; a composable returning `undefined` is still invoked
  once on the client.

## Barrel

Add to `src/lib/index.ts` under `// * State`, in path order:
`computedWithControl`, `createSharedComposable`, `refAutoReset` (before `until`).

## Boundaries

In scope: the 3 modules above, their barrel lines, `feature_list.json` statuses +
feat-014 evidence, `progress.md`, `session-handoff.md`. Out of scope: the 10 cut
functions (recipes exist), any other batch.

## Escape hatches

- If `bun run check` rejects the overload implementation signature, STOP and
  report — do not add an `as`.
- If `vi.useFakeTimers()` interacts badly with `mountUtil`'s `$effect`
  scheduling, install fake timers after mount and restore in `afterEach`.
- If `computedWithControl` cannot be read outside component init, keep the same
  constraint as the other effect-backed utils and document it.
