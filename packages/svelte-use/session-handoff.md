# Session Handoff — svelte-use

## Current State

- Harness and tooling configured in `packages/svelte-use/` (see `progress.md`).
- Pure library package (no SvelteKit shell). **74 util modules shipped**:
  - `browser/` (41): `onClickOutside`, `onElementRemoval`, `onKeyStroke`,
    `onLongPress`, `onStartTyping`, `useBase64`, `useBreakpoints`, `useClipboard`,
    `useColorMode`, `useCssSupports`, `useCssVar`, `useDark`, `useDraggable`,
    `useDropZone`, `useElementByPoint`, `useElementHover`, `useEventListener`,
    `useFileDialog`, `useFullscreen`, `useInfiniteScroll`, `useKeyModifier`,
    `useMagicKeys`, `useMouse`, `useMouseInElement`, `useMousePressed`,
    `useObjectUrl`, `usePageLeave`, `usePointer`, `usePointerLock`,
    `usePointerSwipe`, `usePreferredLanguages`, `usePreferredReducedTransparency`,
    `useScriptTag`, `useScroll`, `useScrollLock`, `useSmoothScroll`,
    `useStyleTag`, `useSwipe`, `useTextareaAutosize`, `useTextDirection`,
    `useWindowFocus`
  - `state/`: `useStorage`/`useLocalStorage`/`useSessionStorage`, `useToggle`,
    `useCounter`, `usePrevious`, `useLastChanged`, `useCloned`, `useCycleList`,
    `useStepper`, `useOffsetPagination`, `useControllableState`, `refAutoReset`,
    `until`
  - `utilities/`: `useDebounceFn`, `useThrottleFn`, `useTimeoutFn`,
    `useIntervalFn`, `useCountdown`, `useRafFn`, `useFps`, `useNow`,
    `useTimestamp`
  - `elements/`: `useMutationObserver`, `useResizeObserver`,
    `useIntersectionObserver`, `useElementVisibility`, `useElementBounding`,
    `useFocus`, `useFocusWithin`
    (new category, feat-017 - **done**, Batches A-D)
  - `shared/`: `usePrecision` (the only util filed there — pure math with no
    DOM surface), plus the internal helpers `is.ts` (20 guard/predicate
    exports), `getter.ts`, `units.ts`, and `element.ts` (`MaybeElement`,
    `MaybeHTMLElement`, `MaybeElements`, `resolveElements`, and the internal
    `isWindowLike` / `isDocumentLike` / `isScrollableElement` /
    `scrollElementOf` guards lifted out of `useScroll`)
    — internal helpers, **not** utils.
  - `network/` (new category, feat-023 Batch A): `useNetwork`,
    `useBrowserLocation`, `useShare`, `useUrlSearchParams`
- Suite: **1383 tests / 150 files**. `dist` builds, `publint` clean.
- `feature_list.json` is **implement-only, and this package only**: 25 features,
  129 functions, no `cut`/`deferred`/`svelte-native` statuses and **no**
  `package:` markers. 20 features done, 5 todo; 84 functions done, 42 todo (of
  126 — `useClamp`, `useToNumber` and `useId` were cut to recipes, not shipped). The `features` array
  is physically ordered by tier (T1, then T2, then niche, then extra), historical
  order kept inside each tier.
  Per-function `tier` (`T1`/`T2`/`niche`/`extra`) where the roadmap named a
  function directly; otherwise the feature's `tier` applies. **The function's own
  `tier` wins over its feature's**, and four sit inside niche features while
  counting as T2 (`useGeolocation`, `useIdle`, `usePermission` in feat-024,
  `useWakeLock` in feat-026). Group by feature tier instead and you get
  "T2 17 / niche 38" and both halves are wrong. Read the effective tier.
- `docs/recipes.md` holds **all 100** deliberately-not-ported hooks with a
  "Use instead" column, and is the source the Astro migration docs render from.
  There is **no** `feature_list.recipe.json` — do not create one.

## Immediate Next Task

- `feat-016`, `feat-018`, `feat-019`, `feat-021`, and **`feat-022`** are **done**
  (feat-018 closed 2026-10-04 with `useFullscreen`, `usePageLeave`,
  `useWindowFocus`).
  feat-022 shipped 8 functions across four batches: `useColorMode`, `useCssSupports`,
  `useCssVar`, `useObjectUrl`, `useScriptTag`, `useStyleTag`, `useBase64`,
  `useFileDialog`, plus `useClipboard.copy` widened to `string | ClipboardItems`.
  `useClipboardItems` and `useImage` were **deleted from `feature_list.json`**, not
  marked with a status — the file's `note` tracks only what ships, so both are
  `docs/recipes.md` rows now.
  Roadmap order is by tier, not by feature id, and the array is now stored in
  that order so the remaining work reads top-down.
- **T1 IS COMPLETE. Zero T1 functions remain anywhere in the list.** Tier 2 has
  **11 functions left across 3 features**, in this order:
  `feat-023` (4 left: `useBroadcastChannel`, `useEventSource`, `useFetch`,
  `useWebSocket` — Batch A shipped the other 4; plan in
  `advisor-plans/feat-023-network.md`), `feat-024`
  (`useGeolocation`, `useIdle`, `usePermission`), `feat-026` (`useWakeLock`).
  Then niche (34). Note a feature marked `done` is not the same as "nothing left
  in it" - read the function statuses, not the feature status, when picking work.
  (`feat-011`, `feat-019` and `feat-020` were all that shape and closed
  2026-10-04; `feat-027` closed 2026-10-05 with one ship and two cuts, and
  `feat-032` with one ship and one cut.)
- **Count the effective tier (`fn.tier ?? feature.tier`), not the explicit
  field.** `feat-020` carried four untiered entries that inherited its T2, which
  is how "one T2 remains" was the wrong answer twice. Four functions still sit
  inside niche features while counting as T2 (`useGeolocation`, `useIdle`,
  `usePermission` in feat-024, `useWakeLock` in feat-026); grouping by feature
  tier reports "T2 17 / niche 38" and both halves are wrong.
- **`feat-017` elements is done** — Batches A-D shipped
  `useMutationObserver`, `useResizeObserver`, `useIntersectionObserver`,
  `useElementVisibility`, `useElementBounding`, `useFocus` and `useFocusWithin`
  (2026-10-04) plus the shared `shared/element.ts` resolver every element util in
  this feature reuses.
  - **Decided, do not re-litigate:** the three observers are _not_ unified behind
    a shared helper (their return shapes genuinely differ), there is no
    `usePausable` (`useIntersectionObserver` inlines `pause`/`resume`/`isActive`),
    and `useElementVisibility` has no `controls` flag — it always returns
    `stop`. Three VueUse behaviours are deliberately _not_ reproduced, all
    documented in the READMEs: `once` stopping on the second report instead of
    the first, the bare-ref default return, and `useFocusWithin` re-checking
    `:focus-within` on `focusout` (which is stale by construction — it is
    dispatched before focus moves, so the flag sticks on; this implementation
    uses `contains(relatedTarget)`). Do not "restore" any of them without a
    reason.
  - **Focus utils type their target as `MaybeGetter<MaybeHTMLElement>`**, not
    `MaybeElement`, so `useEventListener`'s `HTMLElementEventMap` overload returns
    a typed `FocusEvent` instead of `Event` + a cast. `shared/is.ts` `isNode()`
    narrows `relatedTarget` the same way. Src keeps **zero** `as` casts.
  - `useFocus.focused` is readable _and_ assignable. Assign through the returned
    object — destructuring copies the getter's value and leaves no setter. Same
    limit VueUse's `WritableComputedRef` has.
  - `useElementHover` is listed in feat-017 for provenance only — it already
    shipped; do not re-port it. Its inline `MutationObserver` watches `document`,
    not an element, and stays that way on purpose (see its `ponytail:` comment).
- **`feat-018` is done** (2026-10-04) — `useFullscreen`, `usePageLeave`,
  `useWindowFocus`. Four decisions, all documented in the READMEs, none of them
  to be "restored" to match upstream without a reason:
  - **`useFullscreen` is standard-API only.** Upstream probes ~20 prefixed
    spellings across four name tables; `lib.dom` types only the unprefixed four,
    and every browser that shipped a prefix has shipped the standard version
    since ~2011. Dropping them deleted ~half the implementation and its four
    `@ts-expect-error`s. `webkitEnterFullscreen` is video-only on iPhone — the
    README points at `<video controls>`.
  - **`isSupported` = the two methods exist.** Upstream also requires a
    `fullscreenEnabled`-style flag, which is a _permission_ bit, not a capability.
  - **`isFullscreen` compares `document.fullscreenElement`** against the target.
    Upstream reads a _resolved property name_ as the state, which was right for
    `webkitIsFullScreen` ("is in fullscreen") and wrong for the standard
    `fullscreenEnabled` ("is fullscreen allowed") — so on current browsers it
    reports `true` whenever the API merely exists, and its `exit()` then refuses
    to run.
  - **`usePageLeave`'s `mouseenter` has its own handler.** Upstream shares one
    `isLeft = !event.relatedTarget` handler across all three events, so
    re-entering with a nullish `relatedTarget` sets `isLeft` back to `true`.
- **`feat-019` is done** (2026-10-04) — all 7 functions, `useInfiniteScroll` and
  `useMouseInElement` closing it. Both are compositions of already-shipped utils
  and own no observer: `useScroll` + `useElementVisibility`, and `useMouse` +
  `useResizeObserver` + `useMutationObserver`. That is the entire reason they were
  parked behind feat-017, and the reason they cleared once it shipped. Five
  decisions, all documented in the READMEs:
  - **`useScroll`'s cross-realm guards now live in `shared/element.ts`**
    (`isWindowLike` / `isDocumentLike` / `isScrollableElement` /
    `scrollElementOf`). `useInfiniteScroll` needs the identical resolution
    because a `Window` or `Document` cannot be observed at all. That file is not
    in the barrel, so they stay internal.
  - **`useScroll.measure()` checks `isBrowser` before resolving the getter.** It
    is public API, and `() => window` threw `ReferenceError` on the server.
    Found by the SSR probe; fixed at the source, not in the caller.
  - **`useInfiniteScroll` gained `reset()`**, and clears its `interval` timer on
    unmount so an in-flight load is abandoned rather than resolving into a dead
    component. It drops upstream's `controls` / `scheduler` and the directive
    build, and keeps `interval` as a **floor** (`max(onLoadMore, interval)`,
    upstream's real `Promise.all` semantics).
  - **`canLoadMore` is asked per check, never memoized in a `$derived`** — see
    the harness note below. A synchronous throw from `onLoadMore` is routed
    through `Promise.resolve().then(...)` so it reaches `onError`.
  - **`useMouseInElement` binds through `useEventListener/bind.ts`**, because the
    public `useEventListener` returns `void` and `stop()` needs the detachers. Its
    `update()` writes a plain local per field and assigns the `$state` once at the
    end — see the harness note below. Upstream's `windowScroll` / `windowResize`
    doc comments are swapped; ours are correct.
- `feat-015` (async + history) is tier **`niche`** — deliberately last, not
  next. `feat-012` is `useTimeAgo` only, tier T2.
- `useNow` / `useTimestamp` **shipped** (2026-10-04), which closes `feat-011`
  entirely — it has no `todo` entries left. Both are thin wrappers over the
  shipped `useRafFn`: the frame loop already existed and they only own the state
  it drives, so neither contains timing logic.
  - **Both drop `ConfigurableScheduler`.** No shipped util accepts a `scheduler`
    option — `useCountdown` takes one as a _private_ parameter for testability.
    Do not add a public one.
  - **Both drop `controls`.** `UseNowReturn` / `UseTimestampReturn` `extend
UseRafFnReturn`, so `isActive` / `pause` / `resume` are always returned and
    the `<Controls extends boolean>` generic, the conditional return type and
    both overloads are gone. Same call `useElementVisibility` made.
  - **`isActive` must be forwarded with a getter**, never destructured off the
    `useRafFn` result: destructuring reads the getter once and freezes it at
    `false`. `useNow`'s test pins both halves of that.
  - **`useNow` holds a `SvelteDate`,** not a `Date` — see the harness note below.
  - **`useTimeAgo` was NOT resurrected** — it stays a recipe on the strength of
    native `Intl.RelativeTimeFormat`. Do not re-add it.

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
  **Never call it from a callback** — see the harness note below; that is what
  made `usePointerLock` unusable.
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

- **`perfectionist/sort-interfaces` sorts by LINE LENGTH, descending** - not
  alphabetically. `checkValidity` (56 chars) sorts before `dataTypes` (35), which
  is why `useDropZone`'s options read callbacks-first and `multiple` last.
  Hand-sorting is a waste: `bunx eslint <path> --fix` places them correctly, and
  `perfectionist/sort-object-types` does the same for object types. Run `lint:fix`
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
- **To reorder the `features` array, splice the text and never the JSON.** Parse
  it to _decide_ the new order, then move whole block strings and re-`JSON.parse`
  to prove it still parses; tabs and LF endings are easy to lose. Prove it was
  order-only with a differential script comparing the sorted
  `id:functionCount:status` projection against `git show HEAD:...`. A 25-entry
  reorder is a 320-line diff by nature - that is expected, not a mistake.
- **jsdom has no `ResizeObserver` and no `KeyboardEvent` constructor in the
  `node` environment.** Use `MockResizeObserver.install()` from
  `test/fixtures/observers.ts`, and stub `scrollHeight` with
  `Object.defineProperty` when testing anything that measures.
- **jsdom also has no object-URL registry** (`URL.createObjectURL` /
  `revokeObjectURL` do not exist). Add them as own properties on the _real_ `URL`
  with `Object.defineProperty`, and `Reflect.deleteProperty` in `afterEach`.
  `vi.stubGlobal('URL', { ...URL, … })` also works but replaces the constructor,
  which breaks anything else in the environment that expects it.
- **An effect that reads and writes the same `$state` throws
  `effect_update_depth_exceeded`** — and the symptom is a test file that takes
  minutes to fail with every value empty, not a clean failure. Any imperative
  guard called from inside an `$effect` (`load()`, `start()`, `pause()`) must read
  its own flag through `untrack()`. See `useStyleTag`'s `isLoaded`.
- **Write-then-read inside an effect is the same bug, and it hides behind stable
  values.** `useMouseInElement.update()` assigned `elementPositionX` and then
  computed `mouse.x - elementPositionX`, so the effect depended on state it had
  just written. With **one** rect the second run wrote identical values and settled
  silently; with **two** rects the intermediate write dirtied the first and it
  looped until Svelte gave up — 47 seconds, `effect_update_depth_exceeded`, in
  exactly the wrapped-inline-element case the `getClientRects()` loop exists for.
  **Compute into plain locals and assign each `$state` once, at the end.** `untrack`
  is not a fix here: the reads are real reads, and the values still move.
- **A getter-returning util breaks if the caller destructures it.** `const {
isVisible } = useElementVisibility(...)` reads the getter once, so a tracking
  effect that reads the copy never sees it change — `useInfiniteScroll` silently
  loaded **nothing**, and 12 of 14 tests failed with zero calls. Keep the object
  and read `.isVisible` inside the effect. Same trap as `isActive` in `useFocus`
  and `useNow`.
- **Do not memoize a callback option in a `$derived`.** `canLoadMore` in a derived
  caches its first answer forever when the closure reads no reactive state, so
  `() => page < last` silently never updates. Ask a function option per check, the
  way upstream does.
- **A synchronous `throw` from a user callback skips a later `.catch`.**
  `Promise.all([onLoadMore(state), sleep(interval)])` throws before `Promise.all`
  is even entered if `onLoadMore` throws while building the array — upstream has
  this hole. Wrap it: `Promise.resolve().then(() => onLoadMore(state))`.
- **Duck-typing a DOM element with `in` is not a structural check.**
  `'noModule' in el` is false for jsdom's `HTMLScriptElement`, and `'sheet' in el`
  depends on the stylesheet having been parsed — both fail silently as "not found".
  `querySelectorAll('script')` is already typed `NodeListOf<HTMLScriptElement>`,
  so no guard is needed at all; where a guard is, use `el.tagName`.
- **`CSS.escape` is for identifiers, not quoted attribute values.** VueUse's
  `querySelector(\`script[src="${CSS.escape(url)}"]\`)`does not match a real URL,
so its dedupe silently degrades to always-injecting. Filter the elements and
compare resolved`src`instead (which also matches a relative`src`).
- **Neither `svelte-check` nor `publint` can see a broken published type
  surface.** `publint` reports "All good!" on declarations a consumer cannot
  compile, and `svelte-check` reads source, not the emitted `.d.ts`. Two distinct
  `useCloned` failures shipped that way, so `init.ps1` / `init.sh` now
  (a) typecheck `test/dist-consumer-probe.ts` against `dist` and (b) scan every
  emitted `dist/**/*.d.ts` for rune identifiers after stripping comments. Keep
  the probe's imports honest — a wrong property name there is a false failure.
- **Svelte's snapshot type is unnameable and unserializable.** `$state.snapshot`
  returns `Snapshot<T>`, declared in `svelte/types/compiler/interfaces`, so
  neither `Snapshot` nor `snapshot` can be imported from `svelte` (verified on
  `svelte@5.57.1`). Consequences: letting a helper infer it triggers **TS7056**,
  which _silently suppresses that module's `.d.ts`_ while both tools report
  success; and writing `ReturnType<typeof $state.snapshot<T>>` in an exported
  type ships a rune, giving consumers **TS2304**. Keep the snapshot type out of
  exported positions — `ClonedSnapshot<T> = T` with one documented cast at the
  `structuredClone` call site. The snapshot step itself is **not** optional:
  `structuredClone` on a `$state` proxy throws `DataCloneError`.
- **`SvelteDate` is the only `Date` allowed in reactive state, and it cannot be
  faked.** `svelte(prefer-svelte-reactivity)` rejects `new Date()` in a `$state`
  slot (error, not warning). `SvelteDate extends Date`, so `instanceof` and every
  method hold and the public type can stay `Date`; `index-server.js` exports it
  as `globalThis.Date`, so no `isBrowser` guard is needed. But `extends` binds
  the base class **at module-evaluation time**, so a `globalThis.Date` installed
  later by `vi.useFakeTimers()` / `vi.setSystemTime()` never reaches its
  constructor — `new SvelteDate()` returns the _real_ clock. Assert on real epoch
  values, or track a `Date.now()` number (which fakes fine) and build the `Date`
  in a getter.
- **`vi.useFakeTimers()` also fakes `requestAnimationFrame`,** silently
  replacing `mockRaf()`'s manual mock. `raf.step()` then drives nothing and the
  test fails on a stale value instead of on a missing frame, which reads like a
  bug in the util. Use `vi.useFakeTimers({ toFake: ['Date'] })` whenever a manual
  rAF is installed.
- **`feature_list.json` has no consistent key order per feature, and some
  features have no `evidence` key at all** (feat-017 puts it before `tier`,
  feat-006 before `functions`, feat-011 had none). A forward `indexOf('"evidence":
')` from a feature's `id` will therefore land in a _different_ feature and
  corrupt the file. **Always assert an anchor matches exactly once and
  `JSON.parse` after every step** — a silent 0-match replace is the same failure.
- **The working copy of `feature_list.json` is CRLF after `git checkout`**
  (autocrlf), so a `\n`-joined multi-line anchor matches zero times. Detect the
  newline first, or use a whitespace-tolerant regex.
- **`until` cannot be called from a callback, and the symptom is not a rejected
  promise — it is `Svelte error: effect_orphan`.** `until` builds its own
  `$effect`, so a call from an event handler (long after component init) creates
  an effect with no owner and Svelte throws. A util whose public method is called
  from a handler must settle its promise from an effect created **at init**, as
  `usePointerLock.lock` now does. Make that helper take a **type-guard
  predicate** (`(current): current is T`) rather than a boolean test: a boolean
  cannot narrow, so something ends up asserting the matched value.
- **An `in` check is not a support check.** `'elementFromPoint' in document`
  accepts a name that is present but `undefined` — supported-looking, and it
  throws on the call, inside a rAF callback where vitest reports it as an
  _unhandled error_ rather than a test failure. Probe `typeof x === 'function'`
  for anything you will invoke.
- **A test helper that is more permissive than the platform hides real bugs.**
  `usePointerSwipe`'s pointer-event helper defaulted `buttons: 1` for _every_
  event type, so a `pointerup` never reported the `buttons: 0` the browser
  actually sends — and the util's up-path re-filtered on "a button is down", so a
  mouse swipe could never end. Default test inputs to what the platform does,
  not to what keeps the assertions short.
- **Effects run in creation order on mount — and a write effect created before
  the read effect writes first.** `useUrlSearchParams`' write-back effect ran
  before its initial-read effect, so mounting alone overwrote the URL with the
  still-empty state. An `initialized` flag held it until the initial read ran.
  Creation order is deterministic, but say it with a flag anyway.
- **Ad-hoc `bunx tsc` needs `--ignoreConfig`** (TS5112 when a tsconfig exists).
  Never point a declaration-emitting `tsc` run at the repo — it writes `.d.ts`
  next to sources and fixtures; use `--noEmit` or an external temp dir.

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

- **Last Updated**: 2026-10-06
- **Current Objective**: `feat-023` Batch A is **done** — `useNetwork`,
  `useBrowserLocation`, `useShare`, `useUrlSearchParams` shipped (new
  `network/` category), closing 4 of 8. Counts: 25 features (20 done / 5
  todo), 126 functions (84 done / 42 todo), 74 modules, 1383 tests / 150
  files, T2 down to 11 across 3 features.
- **Recommended Next Step**: `feat-023` Batch B (`useBroadcastChannel`,
  `useEventSource`), then C (`useFetch`), then D (`useWebSocket`) — full plan
  in `advisor-plans/feat-023-network.md`.
  Nine conventions the last ten batches settled, worth reusing rather than
  re-deriving:
  - Event type guards (`isPointerEvent`, `isMouseEvent`, `isTouchEvent`,
    `isElement`) and `Position` live in `shared/`; `bindListener` lives in
    `useEventListener/bind.ts`. Use them; do not add a private copy.
  - **Probe DOM shapes with `in`, never `instanceof`**, so a node from another
    realm still works — and keep the probe's optional properties optional so a
    target that lacks one is a skip, not a crash. `no-unsafe-type-assertion`
    rejects casting `EventTarget` to `Element`, so a guard is the only route.
  - **An option must not get a `$derived` of its own** if it is a getter **or a
    function**. A derived with no reactive dependency caches its first value
    forever and silently stops updating — `useSwipe`'s `threshold` and
    `useInfiniteScroll`'s `canLoadMore` were both exactly this. Read the option
    inside a derived that depends on real state, or just ask it per check.
  - **Never destructure a getter off another util's return.** Read the property
    where it is consumed; see the harness notes for the two utils that got this
    wrong.
  - **Compute into plain locals and assign `$state` once per field** inside a
    function that an `$effect` calls. Write-then-read is a self-invalidation.
  - A `$derived` or `$state` passed where a _value_ is wanted warns
    (`state_referenced_locally`) and freezes it. Bind by hand when an option must
    be read at bind time, like `passive` in `useDraggable` and `useSwipe`.
  - `createBox` from `test/fixtures/box.svelte.ts` is how a rune-free
    `.test.ts` drives a reactive source. A plain `let` will not re-run anything.
  - **jsdom metrics never move on their own.** Anything that re-checks after an
    async step (infinite scroll re-checks after every load) loops forever in tests
    unless each spy either mutates the stubbed `scrollHeight` / `getClientRects`
    or closes its own gate. Stub with `Object.defineProperty`, and expect the loop.
  - `src/lib/state/useStepper/index.svelte.ts:8` and
    `useOffsetPagination/index.svelte.ts:43-44`, which emit
    `state_referenced_locally` warnings during `vitest` (they do not fail
    `svelte-check`, which stays 0/0). Do not add more: Batch B learned that
    passing a `$derived` where a value is wanted produces exactly these.
