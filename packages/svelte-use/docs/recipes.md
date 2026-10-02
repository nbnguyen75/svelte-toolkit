# Recipes — cut, deferred, and Svelte-native patterns

Everything the roadmap intentionally does **not** ship as library code, and
what to reach for instead. Rationale for every `cut` / `deferred` /
`svelte-native` status lives here; the machine-readable status lives in
`feature_list.json` (`function.status`).

**The rule for this file:** if a recipe fits on screen without scrolling, it
is not here. Write the `$derived` or `$effect` yourself. The trivial
compositions that used to appear below were deleted for exactly that reason —
their one-line reasons are kept in the index table, but their snippets are not,
because a 3-line snippet that saves you 3 lines is a worse import than the
one you just wrote.

Snippets are SSR-safe unless noted. `MaybeGetter<T>` is `T | (() => T)`;
`resolve` unwraps it (`typeof v === 'function' ? v() : v`). Snippets calling
`$effect` must run in component initialization.

---

## Why these are not utilities

The yardstick ([`.agents/rules/scope.md`](../.agents/rules/scope.md) §3): a
function earns library code only if it owns **lifecycle**, **environment
branching**, **non-trivial reactive state**, a **real algorithm with options**,
or is a **building block for another util**. Otherwise it is a recipe.

| Group    | Not ported                                                                                                                     | Why                                                                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timing   | `useTimeout`, `useInterval`, `useNow`, `useTimestamp`                                                                          | Thin wrappers over the kept `useTimeoutFn` / `useIntervalFn`, or sub-10-line tickers.                                                                                                                       |
| Watchers | `watchOnce`, `watchImmediate`, `watchDeep`, `watchDebounced`, `watchThrottled`, `watchPausable`, `whenever`, `watchWithFilter` | Plain `$effect` covers the one-liners; kept filter utils cover the rest. `watchDeep` needs nothing — `$state` proxies already track nested reads.                                                           |
| Refs     | `refDefault`, `refDebounced`, `refThrottled`, `refManualReset`, `refWithControl`, `syncRef`, `syncRefs`, `computedEager`       | Nullish fallback in a `$derived`; reset/veto/untrack are a `$state` cell plus a setter; the kept filters cover settle behavior; `syncRef` needs microtask loop guards; `$derived` is already eager on read. |
| Async    | `useCached`                                                                                                                    | Gate updates behind a comparator in one `$effect`.                                                                                                                                                          |
| Viewport | `useSSRWidth`                                                                                                                  | A one-line SSR fallback constant; use `useWindowSize` (feat-016) when live updates matter.                                                                                                                  |
| Math     | `useMin/Max/Average/Sum/Round/Ceil/Floor/Trunc/Abs`, `useMath`, `logicAnd/Or/Not`, `useProjection`                             | One-line deriveds; templates already express `&&` / `\|\|` / `!` natively. `createProjection` is kept in feat-027.                                                                                          |
| Shared   | `isDefined`, `get`, `set`, `useToString`, `reactify`, `reactiveComputed`, `createEventHook`, `createGlobalState`               | Inline the checks, or derive over reactive inputs directly. `createEventHook` is a callback prop / `$state`; `createGlobalState` is a factory you write (or scope through context).                         |

---

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

## Drag and drop

Two questions decide this, and they lead to different answers.

**Is `@neodrag/svelte` enough?** If you want free-form dragging of an element
or a handle, yes — it is ~2KB, SSR-friendly, and a single `use:draggable`
action. This package also ships **`useDraggable`**, a dependency-free port of
VueUse's element/handle dragging, for the cases where you would otherwise
hand-roll `pointerdown` → `pointermove` → `pointerup` with a transform.

**Do you need a full DnD engine?** Windowing, multi-container support,
sensors, and keyboard accessibility are not problems worth solving here:

- **Simple sortable list** → `sortablejs` behind a ~15-line Svelte action
  (`Sortable.create(node, { animation: 150, onEnd })`, destroy in the action
  cleanup).
- **Complex DnD** (multi-container, sensors, keyboard, full a11y) →
  `@dnd-kit/svelte` with the **snapshot pattern** (`onDragStart` saves
  `items.slice()`, `move()` runs in `onDragOver`, `onDragEnd` restores on
  cancel) — never reorder DOM outside Svelte's reconciler.

`useSortable` is a `deferred` integration adapter, not core scope.

## Virtual lists (deferred to `@tanstack/svelte-virtual`)

```bash
bun add @tanstack/svelte-virtual
```

Windowing, overscan, dynamic measurement, and list a11y belong to the
dedicated lib; pair it with `useElementSize` (feat-017) for container
measurement.

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

## Svelte-native skips (guidance, no port)

Svelte 5 already ships these. Do not wrap them; a wrapper costs an import, a
type, a README, and a test to save two lines, and it _loses_ composability,
because a caller cannot spread a util's return into their own `$derived`.

```svelte
<!-- useTitle: -->
<svelte:head><title>{title()}</title></svelte:head>

<!-- useTransition: svelte/motion owns tweening -->
<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	const progress = tweened(0, { duration: 400, easing: cubicOut });
</script>

<!-- useAnimate: svelte/animate, svelte/transition, or raw WAAPI -->
<script lang="ts">
	$effect(() => {
		const animation = node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
		return () => animation.cancel();
	});
</script>
```

```ts
// useMounted: an $effect body IS mount — no composable needed.
$effect(() => {
	mounted = true;
	return () => (mounted = false);
});
```

`online` and `devicePixelRatio` come from `svelte/reactivity/window`, which
ships SSR-safe `undefined` fallbacks and cleans up on destroy:

```ts
import { online, devicePixelRatio } from 'svelte/reactivity/window';

// Already a reactive value — no wrapper, no listener of your own.
$effect(() => {
	if (!online.current) pause();
});
$effect(() => {
	zoom.set(devicePixelRatio.current);
});
```

`useOnline` and `useDevicePixelRatio` are therefore **`svelte-native`**, not
cut: the capability exists, it just is not ours. The full delegation table —
`MediaQuery`, `SvelteSet`/`SvelteMap`/`SvelteDate`/`SvelteURL`, and
`createSubscriber` — is in
[scope.md](../.agents/rules/scope.md) §5.

## Integration adapters (in `@wynn-dev/svelte-use-integrations`)

`useAxios` (`peer: axios`), `useFuse` (`peer: fuse.js`), and `useIDBKeyval`
(`peer: idb-keyval`) arrive as thin ports in `@wynn-dev/svelte-use-integrations`, after
everything else. Until then:

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
