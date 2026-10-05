# Recipes — VueUse hooks you do not need in Svelte

Every VueUse function this package deliberately does not ship, and the
Svelte-native thing to reach for instead.

This file is the source of truth for anything not in
[`feature_list.json`](../feature_list.json), and it is what the Astro
migration docs render from: one row per VueUse hook, so a Vue user can look up
the hook they know and see the Svelte answer next to it.

The yardstick ([`.agents/rules/scope.md`](../.agents/rules/scope.md) §3): a
function earns library code only if it owns **lifecycle**, **environment
branching**, **non-trivial reactive state**, a **real algorithm with options**,
or is a **building block for another util**. Otherwise it is a recipe.

Two kinds of entry live here:

- **Dropped** — Svelte or the platform already does this. Wrapping it costs an
  import, a type, a README, and a test to save two lines, and it _loses_
  composability, because a caller cannot spread a util's return into their own
  `$derived`.
- **Cut** — the effect is real but the whole thing is smaller than the wrapper
  around it.

---

## Master index

| VueUse hook                                                                                                     | Use instead                                                                            |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Timing**                                                                                                      |                                                                                        |
| `useTimeout`                                                                                                    | [`useTimeoutFn`](#timing)                                                              |
| `useInterval`                                                                                                   | [`useIntervalFn`](#timing)                                                             |
| `useDebouncedCallback`                                                                                          | [`useDebounceFn`](#timing)                                                             |
| `useCached`                                                                                                     | [`$effect` + comparator](#timing)                                                      |
| **Watchers**                                                                                                    |                                                                                        |
| `watchOnce`                                                                                                     | [`$effect`](#watchers)                                                                 |
| `watchImmediate`                                                                                                | [`$effect`](#watchers)                                                                 |
| `watchDeep`                                                                                                     | _nothing_ — [`$state` proxies track nested reads](#watchers)                           |
| `watchDebounced`                                                                                                | [`useDebounceFn` + `$effect`](#watchers)                                               |
| `watchThrottled`                                                                                                | [`useThrottleFn` + `$effect`](#watchers)                                               |
| `watchPausable`                                                                                                 | [`$state` flag read in `$effect`](#watchers)                                           |
| `watchWithFilter`                                                                                               | [`useDebounceFn` / `useThrottleFn`](#watchers)                                         |
| `watchIgnorable`                                                                                                | [`$effect` teardown / `untrack`](#watchers)                                            |
| `watchTriggerable`                                                                                              | [`$state` token read in `$effect`](#watchers)                                          |
| `watchAtMost`                                                                                                   | [`$effect` + last-seen local](#watchers)                                               |
| `watchArray`                                                                                                    | _nothing_ — [`$state` proxies track nested reads](#watchers)                           |
| `whenever`                                                                                                      | [`$effect` with a `when` guard](#watchers)                                             |
| **Refs & computed**                                                                                             |                                                                                        |
| `refDefault`                                                                                                    | [`$derived(x ?? fallback)`](#refs--computed)                                           |
| `refDebounced`                                                                                                  | [`useDebounceFn` + `$state`](#refs--computed)                                          |
| `refThrottled`                                                                                                  | [`useThrottleFn` + `$state`](#refs--computed)                                          |
| `refManualReset`                                                                                                | [`$state` cell + setter](#refs--computed)                                              |
| `refWithControl`                                                                                                | [`$state` cell + setter](#refs--computed)                                              |
| `computedEager`                                                                                                 | [`$derived` is already eager on read](#refs--computed)                                 |
| `computedWithControl`                                                                                           | [`$state` revision + `$derived`](#refs--computed)                                      |
| `syncRef` / `syncRefs`                                                                                          | [`$effect` + microtask guard](#refs--computed)                                         |
| `useSSRWidth`                                                                                                   | [a constant](#refs--computed)                                                          |
| `useProjection`                                                                                                 | [`$derived`](#refs--computed)                                                          |
| **Arrays**                                                                                                      |                                                                                        |
| `useArrayMap` … `useArrayJoin` (12 hooks)                                                                       | [template expressions + `$derived`](#arrays)                                           |
| `useSorted`                                                                                                     | [`$derived` + `.sort()`](#arrays)                                                      |
| **Math**                                                                                                        |                                                                                        |
| `useMin` `useMax` `useAverage` `useSum` `useRound` `useCeil` `useFloor` `useTrunc` `useAbs` `useMath`           | [one-line `$derived`](#math)                                                           |
| `logicAnd` `logicOr` `logicNot`                                                                                 | [`&&` `\|\|` `!`](#math)                                                               |
| **Shared & state plumbing**                                                                                     |                                                                                        |
| `isDefined`                                                                                                     | [`!== undefined` / optional chaining](#shared--state-plumbing)                         |
| `get` / `set`                                                                                                   | [direct property access](#shared--state-plumbing)                                      |
| `useToString`                                                                                                   | [`String(x)`](#shared--state-plumbing)                                                 |
| `reactify` / `reactifyObject`                                                                                   | [`$state`](#shared--state-plumbing)                                                    |
| `reactiveComputed`                                                                                              | [`$derived`](#shared--state-plumbing)                                                  |
| `reactiveOmit` / `reactivePick`                                                                                 | [rest spread / destructuring](#shared--state-plumbing)                                 |
| `toReactive`                                                                                                    | [`$state`](#shared--state-plumbing)                                                    |
| `makeDestructurable`                                                                                            | [a plain object with getters — what our utils already return](#shared--state-plumbing) |
| `createProjection` / `createGenericProjection`                                                                  | [`$derived` over a reactive object](#shared--state-plumbing)                           |
| `createEventHook`                                                                                               | [a callback prop + `$state`](#shared--state-plumbing)                                  |
| `useEventBus`                                                                                                   | [a `$state` map + `$effect`](#shared--state-plumbing)                                  |
| `createGlobalState` / `createSharedComposable`                                                                  | [context (`setContext` / `getContext`)](#shared--state-plumbing)                       |
| `composeHandlers` / `mergeProps`                                                                                | [`mergeProps` from `svelte/mergeprops`](#shared--state-plumbing)                       |
| `useBoolean`                                                                                                    | [`useToggle` (shipped)](#shared--state-plumbing)                                       |
| **Svelte already has it**                                                                                       |                                                                                        |
| `useWindowSize` `useWindowScroll` `useOnline` `useDevicePixelRatio`                                             | [`svelte/reactivity/window`](#svelte-already-has-it)                                   |
| `useMediaQuery` `usePreferredDark` `usePreferredContrast` `usePreferredReducedMotion` `usePreferredColorScheme` | [`MediaQuery` / `prefersReducedMotion`](#svelte-already-has-it)                        |
| `useElementSize`                                                                                                | [`bind:clientHeight` / `ResizeObserver`](#svelte-already-has-it)                       |
| `useActiveElement` `useDocumentVisibility`                                                                      | [binding on `<svelte:document>` / `<svelte:window>`](#svelte-already-has-it)           |
| `useTitle` `useFavicon`                                                                                         | [`<svelte:head>`](#svelte-already-has-it)                                              |
| `useMounted`                                                                                                    | [an `$effect` body _is_ mount](#svelte-already-has-it)                                 |
| `useTransition`                                                                                                 | [`Tween` / `Spring` / `tweened`](#svelte-already-has-it)                               |
| `useAnimate`                                                                                                    | [`svelte/animate`, WAAPI, or a transition](#svelte-already-has-it)                     |
| `useImage`                                                                                                      | [`<img onload onerror>` — feat-022](#svelte-already-has-it)                            |
| **Deferred to a shipped util**                                                                                  |                                                                                        |
| `useClipboardItems` (write side)                                                                                | [`useClipboard.copy` (shipped)](#svelte-already-has-it)                                |
| **Deferred to a library**                                                                                       |                                                                                        |
| `useDateFormat` `useTimeAgo` `useTimeAgoIntl` `useTemporalNow`                                                  | [`date-fns` / `Intl` / Temporal](#dates-deferred-to-date-fns)                          |
| `useVirtualList`                                                                                                | [`@tanstack/svelte-virtual`](#virtual-lists-deferred-to-tanstack)                      |
| **Deferred to a sibling feature**                                                                               |                                                                                        |

---

## Timing

`useTimeout` and `useInterval` are thin wrappers over the shipped
`useTimeoutFn` / `useIntervalFn`, which already own the pause/resume/reset
lifecycle. `useDebouncedCallback` is `useDebounceFn` — it already exposes
`cancel()`, `flush()`, and `pending()`.

```ts
import { useDebounceFn } from '@wynn-dev/svelte-use';

const notify = useDebounceFn((message: string) => toast(message), 300);
notify('saved');
notify.flush(); // or .cancel() / .pending()
```

`useCached` gates updates behind a comparator. One `$effect` is the whole
implementation:

```ts
let shown = $state(source());
$effect(() => {
	const next = source();
	if (!isEqual(next, shown)) shown = next;
});
```

## Watchers

`$effect` is the watcher. Every one of these is a `$state` cell or a filter
composed with it — a util would only move the `$effect` somewhere else.

```ts
// watchOnce / watchImmediate — an $effect body runs once per mount anyway.
$effect(() => {
	onReady(value());
});

// watchDebounced / watchThrottled
const onResize = useDebounceFn(() => {
	width = window.innerWidth;
}, 100);
$effect(() => {
	onResize();
});

// watchPausable — flip a flag, read it in the effect.
let paused = $state(false);
$effect(() => {
	if (paused) return;
	tick(counter());
});

// watchIgnorable — the effect teardown IS the undo, and untrack is the
// "don't watch" escape hatch.
$effect(() => {
	// ...work that writes state...
	return () => {
		// undo
	};
});

// watchTriggerable — a token the effect reads.
let trigger = $state(0);
$effect(() => {
	trigger;
	recompute();
});

// watchAtMost — a last-seen local is all the dedupe there is.
let last = $state.raw<string>();
$effect(() => {
	const next = key();
	if (next !== last) {
		last = next;
		emit();
	}
});
```

`watchDeep` and `watchArray` need nothing at all: reading a nested property of
a `$state` proxy already registers the dependency, and writing a nested
property already notifies.

`whenever` is `$effect` with a `when` guard:

```ts
$effect(() => {
	if (ready()) emit();
});
```

## Refs & computed

```ts
// refDefault — nullish fallback in a derived.
const label = $derived(input() ?? 'Untitled');

// refDebounced / refThrottled
let search = $state('');
const apply = useDebounceFn((value: string) => {
	results = query(value);
}, 300);
$effect(() => {
	apply(search);
});

// refManualReset / refWithControl — a cell plus a setter.
let text = $state('');
function setText(next: string, { manualReset = false } = {}) {
	text = next;
	if (!manualReset) clearTimeout(timer);
}

// computedEager — $derived is already recomputed on read, not lazily cached
// behind a watcher. There is nothing to force.

// computedWithControl — manual invalidation is a revision counter.
let revision = $state(0);
const total = $derived.by(() => {
	revision;
	return items().length;
});
const bump = () => (revision += 1);

// syncRef / syncRefs — the loop guard is the whole trick.
let syncing = false;
$effect(() => {
	if (syncing) return;
	syncing = true;
	queueMicrotask(() => {
		syncing = false;
	});
	other = local;
});

// useSSRWidth — a constant.
const SSR_WIDTH = 1280;

// useProjection — project fields off a source object.
const view = $derived.by(() => {
	const { a, b } = source();
	return { sum: a + b };
});
```

## Arrays

Every `useArray*` hook exists because Vue templates cannot call methods. Svelte
templates can. `useArrayMap` is `items.map(...)`, `useArrayFilter` is
`items.filter(...)`, and the reactive version is a `$derived` around it. Same
for `useSorted` — `$derived.by` plus `.sort()` with your comparator.

```svelte
<!-- useSorted, with a $derived so the comparator reruns on change -->
<script lang="ts">
	const sorted = $derived.by(() => [...items].sort((a, b) => a.name.localeCompare(b.name)));
</script>

<!-- useArrayFilter / useArrayMap -->
{#each items.filter((item) => item.active) as item}
	<span>{item.name.toUpperCase()}</span>
{/each}
```

Spread into a copy before sorting: `.sort()` mutates in place, and mutating a
`$derived`'s input is a bug, not a style question.

## Math

Nine one-line `$derived`s and three operators:

```ts
const min = $derived(Math.min(...values()));
const avg = $derived(values().reduce((sum, n) => sum + n, 0) / values().length);
const rounded = $derived(Math.round(raw() * 100) / 100);

// logicAnd / logicOr / logicNot — the language has these.
const ready = $derived(isLoaded() && !isError());
```

## Shared & state plumbing

```ts
// isDefined / get / set / useToString
const name = user?.name ?? '';

// reactify / toReactive / reactiveComputed — runes, not factories.
let items = $state<Item[]>([]);
const total = $derived(items.length);

// reactiveOmit / reactivePick — destructuring.
const { id, ...rest } = entity();

// makeDestructurable — this is what every util in this package already
// returns: a plain object whose reactive fields are getters, so destructuring
// keeps reactivity.
const { canUndo, undo } = history;

// createEventHook — a callback prop plus state.
let onChange = $state<(next: string) => void>(() => {});

// useEventBus — a state map.
const bus = $state<Record<string, ((payload: unknown) => void)[]>>({});

// createGlobalState / createSharedComposable — context is the Svelte answer,
// and it is per-request on the server for free.
setContext('cart', cart);
const cart = getContext<Cart>('cart');

// composeHandlers / mergeProps — the platform ships it.
import { mergeProps } from 'svelte/mergeprops';
```

`createGlobalState` deserves a note: a module-level singleton is a _leak across
SSR requests_, which is exactly why it is not a util here. Context gives you
the shared-instance ergonomics without the shared-request bug.

## Svelte already has it

Do not wrap these. A wrapper costs an import, a type, a README, and a test to
save two lines, and it _loses_ composability, because a caller cannot spread a
util's return into their own `$derived`.

```svelte
<!-- useTitle / useFavicon -->
<svelte:head>
	<title>{title()}</title>
	<link rel="icon" href={favicon()} />
</svelte:head>

<!-- useActiveElement -->
<svelte:window bind:this={win} on:focusin={onFocus} />
<!-- or: <svelte:document bind:visibilityState={visibility} /> -->

<!-- useElementSize -->
<div bind:clientHeight={height}></div>
<!-- or a ResizeObserver for the content box -->
```

```ts
// useWindowSize / useWindowScroll / useOnline / useDevicePixelRatio
import { innerWidth, scrollY, online, devicePixelRatio } from 'svelte/reactivity/window';

// useMediaQuery / usePreferred* — MediaQuery and the named presets.
import { MediaQuery, prefersReducedMotion } from 'svelte/reactivity';
import { prefersReducedMotion } from 'svelte/motion';

const isDark = new MediaQuery('(prefers-color-scheme: dark)');
$effect(() => {
	theme.set(isDark.current ? 'dark' : 'light');
});
```

```ts
// useMounted — an $effect body IS mount.
$effect(() => {
	mounted = true;
	return () => (mounted = false);
});

// useTransition — svelte/motion owns tweening.
import { Tween, tweened } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';
const progress = tweened(0, { duration: 400, easing: cubicOut });

// useAnimate — svelte/animate, svelte/transition, or raw WAAPI.
$effect(() => {
	const animation = node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
	return () => animation.cancel();
});

// useImage — the element IS the state machine; you need the loaded flag only.
let loaded = $state(false);
let failed = $state(false);
```

```svelte
<img
	{src}
	alt=""
	class:loaded
	onload={() => ((loaded = true), (failed = false))}
	onerror={() => ((failed = true), (loaded = false))}
/>
{#if failed}<span>Could not load image</span>{/if}
```

`useImage` returns an async-state bag (`isLoading`, `error`, `execute`,
`delay`) built on a `useAsyncState` this package does not ship, and thirteen
`srcset`/`sizes`/`decoding`/`fetchPriority`/… options that are plain attributes
in the markup above — where the browser applies `srcset` and lazy `loading`
without a util being involved at all. The one thing worth reaching for is a
blob URL from a picked file, which is `useObjectUrl` (shipped).

```ts
// useClipboardItems, write side — useClipboard.copy takes ClipboardItems.
import { useClipboard } from '@wynn-dev/svelte-use';

const { copy, copied } = useClipboard();
await copy([new ClipboardItem({ 'image/png': pngBlob })]);
```

The _read_ side is deliberately not a util, and this is the reason the whole
hook is not ported. VueUse's `useClipboardItems` keeps `content` fresh by
listening on `copy` and `cut` and calling `navigator.clipboard.read()` — which
asks for clipboard-read permission **every time the user copies anything**. The
native path hands you the same data with no permission prompt at all, because
the event that carries it is the paste:

```svelte
<div
	role="presentation"
	tabindex="0"
	onpaste={async (event) => {
		const image = [...event.clipboardData.items]
			.find((item) => item.type.startsWith('image/'))
			?.getAsFile();
		if (image) pasted = image;
	}}
></div>
```

`navigator.clipboard.read()` stays available for the rare case of reading
without a paste — a "paste from clipboard" button — where the permission prompt
is expected rather than surprising.

`online` and `devicePixelRatio` come from `svelte/reactivity/window`, which
ships SSR-safe `undefined` fallbacks and cleans up on destroy. The full
delegation table — `MediaQuery`, `SvelteSet`/`SvelteMap`/`SvelteDate`/
`SvelteURL`, and `createSubscriber` — is in
[scope.md](../.agents/rules/scope.md) §5.

## Dates (deferred to `date-fns`)

Token engine, locales, and pluralization beat any hand-rolled tables.

```bash
bun add date-fns
```

```ts
import { format, formatDistanceToNow } from 'date-fns';

let now = $state(Date.now());
useIntervalFn(() => (now = Date.now()), 30_000);
const label = $derived(format(timestamp, 'yyyy-MM-dd'));
const ago = $derived(formatDistanceToNow(timestamp, { addSuffix: true }));
```

`useTimeAgoIntl` maps to the platform `Intl.RelativeTimeFormat` directly.
`useTemporalNow` maps to the Temporal API docs (still stabilizing — no wrapper
until it settles).

## Virtual lists (deferred to `@tanstack/svelte-virtual`)

```bash
bun add @tanstack/svelte-virtual
```

Windowing, overscan, dynamic measurement, and list a11y belong to the
dedicated lib; pair it with `bind:clientHeight` on the scroll frame for
container measurement.

## Drag and drop

Two questions decide this, and they lead to different answers.

**Is `@neodrag/svelte` enough?** If you want free-form dragging of an element
or a handle, yes — it is ~2KB, SSR-friendly, and a single `use:draggable`
action. This package also ships **`useDraggable`** (feat-020), a
dependency-free port of VueUse's element/handle dragging, for the cases where
you would otherwise hand-roll `pointerdown` → `pointermove` → `pointerup` with
a transform. Its `autoScroll` option is not ported; the README shows the
`onMove` equivalent.

**Do you need a full DnD engine?** Windowing, multi-container support,
sensors, and keyboard accessibility are not problems worth solving here:

- **Simple sortable list** → `sortablejs` behind a ~15-line Svelte action
  (`Sortable.create(node, { animation: 150, onEnd })`, destroy in the action
  cleanup).
- **Complex DnD** (multi-container, sensors, keyboard, full a11y) →
  `@dnd-kit/svelte` with the **snapshot pattern** (`onDragStart` saves
  `items.slice()`, `move()` runs in `onDragOver`, `onDragEnd` restores on
  cancel) — never reorder DOM outside Svelte's reconciler.

`useSortable` is an integration adapter, not core scope.

## Files, codes, tokens (deferred; libs used directly)

```ts
// useQRCode: the qrcode package IS the one-liner; add reactivity ad hoc
// (or useAsyncState, feat-015, once it lands).
import QRCode from 'qrcode';
let qr = $state('');
$effect(() => {
	const text = sourceText();
	if (!text) {
		qr = '';
		return;
	}
	let alive = true;
	QRCode.toDataURL(text).then((url: string) => {
		if (alive) qr = url;
	});
	return () => {
		alive = false;
	};
});

// useChangeCase / useJwt: functional APIs need no wrapper.
import { camelCase } from 'change-case';
import { jwtDecode } from 'jwt-decode';
const key = $derived(camelCase(label()));
const claims = $derived(jwtDecode<Claims>(token()));
```

## Progress, cookies, focus, drawing, validation (deferred; recipes)

```ts
// useNProgress: wire nprogress to SvelteKit navigation (or any router).
import nprogress from 'nprogress';
import { afterNavigate, beforeNavigate } from '$app/navigation';
beforeNavigate(() => nprogress.start());
afterNavigate(() => nprogress.done());

// useCookies: SvelteKit owns cookies server-side; client-side, document.cookie
// (or js-cookie) plus $state is the whole pattern.

// useFocusTrap: the focus-trap lib is framework-agnostic — call it in
// $effect on mount, deactivate in the cleanup.

// useDrauu: use a Svelte whiteboard lib; useAsyncValidator: validate into
// $state (async-validator is agnostic):
import { Schema } from 'async-validator';
let formErrors = $state<unknown>(null);
$effect(() => {
	const snapshot = $state.snapshot(form());
	let alive = true;
	new Schema(descriptor).validate(snapshot).catch((errors: unknown) => {
		if (alive) formErrors = errors;
	});
	return () => {
		alive = false;
	};
});
```

Note the `$app/navigation` import in the `useNProgress` recipe: that is
**user-land** code in a SvelteKit app. Core never imports `$app/*` — see
[scope.md](../.agents/rules/scope.md) §1.

## Integration adapters (in `@wynn-dev/svelte-use-integrations`)

`useAxios` (`peer: axios`), `useFuse` (`peer: fuse.js`), and `useIDBKeyval`
(`peer: idb-keyval`) arrive as thin ports in
`@wynn-dev/svelte-use-integrations`, after everything else. Until then:

```ts
// useFuse shape today: rebuild on data change, cap results.
import Fuse from 'fuse.js';
const fuse = $derived(new Fuse(items(), options()));
const results = $derived(fuse.search(query()).slice(0, limit));

// useIDBKeyval shape today: pair useStorageAsync (feat-015) with idb-keyval
// get/set as the async backend.
```

Adapters declare the underlying library as an **optional peer** dependency —
the user installs it, it is never bundled — and declare `@wynn-dev/svelte-use` as a
**peer**, not a dependency, so a consumer can never end up with two copies
holding split state. `integrations` and `kit` must not depend on each other.
