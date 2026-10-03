# Session Handoff — svelte-use

## Current State

- Harness and tooling configured in `packages/svelte-use/` (see `progress.md`).
- Pure library package (no SvelteKit shell). **36 util modules shipped**:
  - `browser/`: `useEventListener`, `useDark`, `useClipboard`, `useSmoothScroll`,
    `useBreakpoints`, `usePreferredLanguages`,
    `usePreferredReducedTransparency`, `useTextDirection`, `useScroll`,
    `useMouse`, `useMousePressed`, `useScrollLock`, `useElementHover`,
    `onKeyStroke`, `onStartTyping`, `useKeyModifier`, `useMagicKeys`,
    `useTextareaAutosize`
  - `state/`: `useStorage`/`useLocalStorage`/`useSessionStorage`, `useToggle`,
    `useCounter`, `usePrevious`, `useLastChanged`, `useCloned`, `useCycleList`,
    `useStepper`, `useOffsetPagination`, `refAutoReset`, `until`
  - `utilities/`: `useDebounceFn`, `useThrottleFn`, `useTimeoutFn`,
    `useIntervalFn`, `useCountdown`, `useRafFn`, `useFps`
  - `shared/`: `is.ts` (14 guard/predicate exports), `getter.ts`, `units.ts` —
    internal helpers, **not** utils.
- Suite: **700 tests / 74 files**. `dist` builds, `publint` clean.
- `feature_list.json` is **implement-only, and this package only**: 25 features,
  131 functions, no `cut`/`deferred`/`svelte-native` statuses and **no**
  `package:` markers. 14 features done, 11 todo; 46 functions done, 85 todo.
  Per-function `tier` (`T1`/`T2`/`niche`/`extra`) where the roadmap named a
  function directly; otherwise the feature's `tier` applies.
- `docs/recipes.md` holds **all 97** deliberately-not-ported hooks with a
  "Use instead" column, and is the source the Astro migration docs render from.
  There is **no** `feature_list.recipe.json` — do not create one.

## Immediate Next Task

- `feat-016`, `feat-019`, and `feat-021` are **done** (2026-10-03). Roadmap order
  is by tier, not by feature id. Tier 1 left:
  - `feat-022` "Clipboard extras, files, theming" — 10 functions, the **last T1
    feature**: `useColorMode` (T1), `useBase64`, `useClipboardItems`,
    `useCssSupports`, `useCssVar`, `useFileDialog`, `useImage`, `useObjectUrl`,
    `useScriptTag`, `useStyleTag`. Do **not** invent extra members for it:
    `useTextareaAutosize` is listed in feat-022 for provenance and already
    shipped with feat-021, and `useHead` / `useFuse` are **not in the list at
    all** (`<svelte:head>` and a `fuse.js` peer dep respectively — both already
    recipes in `docs/recipes.md`).
  - `feat-017` elements — `useElementVisibility` (T1) + `useElementBounding`,
    `useFocus`, `useFocusWithin`, `useMutationObserver` (T2).
    `useElementHover` moved out of feat-019 and **already shipped** — it is
    listed in feat-017 for provenance only; do not re-port it.
- `feat-019` shipped 5 of its 7 functions. `useInfiniteScroll` and
  `useMouseInElement` stay `todo` and land with **feat-017**, which owns the
  observers they wrap (`useIntersectionObserver`, `useResizeObserver`,
  `useMutationObserver`). The reason and the Svelte-native recipe are in
  `docs/recipes.md` § "Scroll & pointer" — do not port them on an inline
  observer, and do not add `getBoundingClientRect()` per `pointermove` to
  `useMouseInElement`.
- `feat-015` (async + history) is tier **`niche`** — deliberately last, not
  next. `feat-012` is `useTimeAgo` only, tier T2.
- `useNow` / `useTimestamp` are `todo` again (tier T2, on `feat-011`) after
  being cut earlier. **`useTimeAgo` was NOT resurrected** — it stays a recipe on
  the strength of native `Intl.RelativeTimeFormat`. Do not re-add it.

## Cross-package scope: this list is svelte-use only

`feature_list.json` tracks **only what `@wynn-dev/svelte-use` ships**. A function belonging to
another package is not tracked here at all — it goes in that package's own list:

- `feat-030` → `packages/svelte-use-integrations/feature_list.json`.
- The `svelte-base` primitive helpers (the old `feat-029`, 11 functions) were **removed from
  this file** on 2026-10-03. `packages/svelte-base/` does not exist yet, so they are currently
  untracked rather than carried here as a placeholder.

**A hook both packages need is listed in both lists and implemented twice.** That is the
rule, not an oversight:

- `clickOutside` / `escapeKey` → core ships `onClickOutside` (`feat-020`) and `onKeyStroke`
  (`feat-021`); the svelte-base copies are attachments, not composables.
- `useHotkeys` → core ships `useMagicKeys` (`feat-021`).
- `usePagination` → core ships `useOffsetPagination`.
- `sliderMath.clamp` → core ships `useClamp` (`feat-027`).

Those four core entries **are** the sanctioned copies. Nothing else from the sweep was
promoted, and nothing was duplicated into core that core did not already need:

| Not a core function          | Why                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `contextHelpers`             | A `setContext`/`getContext` wrapper. A recipe already points at the natives.                                                   |
| `getCheckableDataAttributes` | Presentational `data-*` mapping for checkbox/switch only.                                                                      |
| `nextRovingTarget`           | Real algorithm (§3.4), but its only consumer is a composite primitive. Exposes a `RovingEntry` type no app-level caller wants. |
| `tooltipDelay`               | Needs module-shared mutable state, which `scope.md` §2 bans in core.                                                           |
| `trackOutsidePress`          | Nested overlay dismissal, which core `onClickOutside` deliberately does not do.                                                |
| `Selection`                  | Base UI state manager whose consumer is a primitive.                                                                           |

**Packages stay independent — do not "fix" the overlap.** Never import across the package
boundary, and never propose a shared internal package to remove the duplication: a shared
dependency would also bind release cadence and peer floor, which is the coupling the split
exists to avoid. Core/base (or core/integrations) overlap is sanctioned and is not a defect to
report.

**The two promotions that did land here — `feat-032` "Ids & controllable state", tier T2:**

- `useId` — env branching (ids must match across SSR and hydration, §3.2) plus being a building
  block (§3.4). Implement on `$props.id()` where a component is available; the svbase counter +
  `Math.random()` form is **not** portable as written (module-scope mutable state, §2, and unstable
  across server/client). README must document `$props.id()` as the first choice.
- `useControllableState` — non-trivial reactive state core lacks, which `useToggle` /
  `useCounter` / `useStorage` each re-invent. Svelte has no controlled/uncontrolled primitive.
  Building block (§3.4).

`feat-031` no longer exists; its Base UI extras either shipped in core as `feat-032` or stayed
with svelte-base.

## Re-tiering done 2026-10-02

`feat-027` + `feat-028` were merged into `feat-027` "Reactive math & value
coercion" (**T2**, was an invalid `recipe-only` tier): `useClamp`,
`usePrecision`, `useToNumber`. All three are one-expression wrappers — if any
fail to clear the bar alone, cut them rather than padding.

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
- **`init.ps1` writes with `Write-Host`, so redirecting it to a file yields an
  empty log** (exit code is still the truth). To read the gate output run
  `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1 2>&1`.
- **`PowerShell > file.log` swallows `bun`/`vitest` output when piped through
  `Select-String`.** Prefer running the command directly; if a file is needed,
  write it with `Out-File -Encoding utf8` from the command itself.
- **A `$state` object subscribes to nothing for a property that has never been
  set.** A util whose reads are keyed by an arbitrary string (`magicKeys.ctrl_k`)
  must not be a `$state` record: the first read of an unset key is untracked, so
  the effect never re-runs. `SvelteMap`/`SvelteSet` read the collection version
  even for a missing key. Root-caused by a failing test; see feat-021.
- **`mountReactive` creates the util _inside_ the reading effect,** which suits
  lazy `createSubscriber` utils but makes a util that owns its own reactive state
  unobservable from that same effect. Use the new `mountInitialized`
  (`test/fixtures/init-reader.svelte`) when the util under test builds its own
  state — it creates at init and reads from a separate effect, like a component.
- **`mountUtil` throws "setup did not produce an API" on a `void` factory.** The
  three listener utils (`onKeyStroke`, `onStartTyping`, and any future `void`
  util) need `mountSetup` instead; the SSR probes just call the factory directly.
- **Do not re-serialize `feature_list.json`.** `JSON.stringify(_, null, 2)`
  reflows every array in the file and buries a 7-line change in ~120 lines of
  whitespace (and switches tabs to spaces). Splice by line number / targeted edit,
  then check `git diff --stat` before moving on. This supersedes the
  `ConvertTo-Json` warning above for this file.
- **jsdom has no `ResizeObserver` and no `KeyboardEvent` constructor in the
  `node` environment.** Use `MockResizeObserver.install()` from
  `test/fixtures/observers.ts`, and stub `scrollHeight` with
  `Object.defineProperty` when testing anything that measures.

## How to Resume

1. Read `packages/svelte-use/AGENTS.md` and `packages/svelte-use/.agents/rules/`.
2. Run `.\init.ps1` to ensure all gates pass.
3. Read `feature_list.json`, sort the `todo` features by `tier`, take the first.

## Blockers

- **None.** `feat-029`/`feat-031` are resolved — nothing in this list is blocked on
  another package, and nothing is blocked on the missing `svelte-base` package. The
  one previously-open maintainer question (which Base UI extras to port vs. write
  fresh) is answered: `useId` + `useControllableState` shipped here as `feat-032`,
  the rest stayed with svelte-base.
- **Open maintainer question, non-blocking:** want a
  `packages/svelte-base/feature_list.json` holding the 11 hooks removed from this
  list on 2026-10-03 (the same way `feat-030` lives in the integrations list), or
  leave svelte-base untracked until the package is scaffolded? Left untracked for
  now; it does not block any core feature.

## Files

- `packages/svelte-use/AGENTS.md` — canonical harness.
- `packages/svelte-use/feature_list.json` — implement-only roadmap, this package only.
- `packages/svelte-use/docs/recipes.md` — all 97 not-ported hooks + replacements.
- `packages/svelte-use/progress.md` — session log.

## Next Session

- **Last Updated**: 2026-10-03
- **Current Objective**: `feat-016`, `feat-019`, and `feat-021` are all done.
  Next by tier is `feat-022` "Clipboard extras, files, theming" (T1, 10
  functions, the last T1 feature), then `feat-017` (observers - worth early
  because it unblocks 11 functions once you count its own 7 plus
  `useInfiniteScroll` and `useMouseInElement` deferred out of feat-019).
  `feat-015` is tier `niche` and deliberately last.
- **Recommended Next Step**: run `.\init.ps1` from `packages/svelte-use/`, then
  take `feat-017` (observers) — it is the highest-leverage feature left, and
  `useTextareaAutosize` already carries a `ponytail:` marker pointing at
  `useResizeObserver` for consolidation.
