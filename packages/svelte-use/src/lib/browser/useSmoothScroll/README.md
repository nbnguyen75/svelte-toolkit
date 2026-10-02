# `useSmoothScroll`

Tween-based smooth scrolling for `window` or any scrollable element. Extends
VueUse's `useWindowScroll` (position tracking only — nothing there animates).

## Signature

```ts
import { useSmoothScroll } from '@wynn-dev/svelte-use';

const { scrollTo, cancel, scrolling } = useSmoothScroll();

await scrollTo(0); // back to the top
await scrollTo(100, { container: listEl }); // 100px inside a scroll frame
await scrollTo(section, { duration: 600, easing: cubicOut }); // element into view
```

## Options

`useSmoothScroll(container?, options?)`

| Parameter               | Type                                                      | Default                  | Description                                  |
| ----------------------- | --------------------------------------------------------- | ------------------------ | -------------------------------------------- |
| `container`             | `MaybeGetter<Window \| HTMLElement \| null \| undefined>` | `() => window` (browser) | Scroll container to tween.                   |
| `container`             | same                                                      | inherited                | Per-call container override.                 |
| `duration`              | `number`                                                  | `400`                    | Animation length in milliseconds.            |
| `easing`                | `(t: number) => number`                                   | `cubicOut`               | Easing applied to tween progress.            |
| `interruptOnUserScroll` | `boolean`                                                 | `true`                   | Abort on `wheel` / `touchstart` / `keydown`. |

State every default. `MaybeGetter<T>` inputs accept a plain value or a
`() => value` getter.

## Returns

| Field       | Type                                                                          | Reactive | Description                                                                                           |
| ----------- | ----------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `scrollTo`  | `(target: number \| Element \| null \| undefined, options?) => Promise<void>` | method   | Tween to `target`; resolves on completion (or without writing when superseded/cancelled/interrupted). |
| `cancel`    | `() => void`                                                                  | method   | Abort any in-flight animation; safe when idle.                                                        |
| `scrolling` | `boolean`                                                                     | getter   | Whether an animation is running.                                                                      |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useSmoothScroll } from '@wynn-dev/svelte-use';

	const { scrollTo, scrolling } = useSmoothScroll();
</script>

<button onclick={() => scrollTo(0)} disabled={scrolling}>Back to top</button>
```

### Scroll inside a frame, and to an element

```svelte
<script lang="ts">
	import { useSmoothScroll } from '@wynn-dev/svelte-use';

	let listEl = $state<HTMLElement>();
	const { scrollTo } = useSmoothScroll();

	function jumpToTop() {
		scrollTo(0, { container: listEl });
	}

	function jumpToSection() {
		scrollTo(document.querySelector('#pricing'), { duration: 600, easing: cubicOut });
	}
</script>
```

### Reduced motion

When `prefersReducedMotion` matches, `duration` is forced to `0` and the
animation is a single synchronous write — the `interruptOnUserScroll` listeners
are skipped too, since there is nothing to interrupt.

### SSR behavior

`scrollTo()` resolves immediately on the server and without a container — no DOM
access, no timers, safe during SSR.

```ts
import { useSmoothScroll } from '@wynn-dev/svelte-use';

// On the server: constructs fine, scrollTo() is a no-op promise.
const { scrollTo } = useSmoothScroll();
await scrollTo(0);
```

## Edge cases & cleanup

- A new `scrollTo()` call supersedes any in-flight animation; only the latest
  run writes and settles `scrolling`.
- An element target resolves against the container: `rect.top` rebased by the
  container's own `getBoundingClientRect()` and `scrollTop`, so it is correct
  inside a scrolled frame rather than only against the viewport.
- Every animation starts from the container's **current** offset, never `0`.
- A user gesture (`wheel`, `touchstart`, `keydown`) cancels the animation, so the
  page does not snap back to a stale offset. Those listeners are removed when the
  run settles; `keydown` is intentionally unfiltered because keys without a
  scrolling effect cancel harmlessly.
- `cancel()` aborts in flight; the abandoned tween promise still settles later
  but performs no writes and touches no shared state (generation guarded).
- Unmounting disposes any in-flight animation: no leaked effect roots, no stale
  writes.
- Window detection is duck-typed (`scrollY`), so cross-realm windows (iframes)
  work where `instanceof Window` would fail.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- Custom API (no direct VueUse counterpart). VueUse's `useWindowScroll` only
  tracks position reactively; nothing there animates scrolling.
- `MaybeGetter<T>` instead of Vue's `MaybeRefOrGetter`; no promise rejection on
  cancel.
