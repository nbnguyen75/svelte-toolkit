# `useScrollToTop`

Animated scroll-to-top helper. Custom utility, no VueUse equivalent.

## Signature

```ts
import { useScrollToTop } from '@wynn-dev/svelte-use';

const { scrollToTop, cancel, scrolling } = useScrollToTop();
await scrollToTop();

const panel = useScrollToTop(() => element, { duration: 600 });
```

## Options

| Parameter  | Type                                                      | Default                  | Description                       |
| ---------- | --------------------------------------------------------- | ------------------------ | --------------------------------- |
| `target`   | `MaybeGetter<Window \| HTMLElement \| null \| undefined>` | `() => window` (browser) | Scroll container to tween.        |
| `duration` | `number`                                                  | `400`                    | Animation length in milliseconds. |
| `easing`   | `(t: number) => number`                                   | `cubicOut`               | Easing applied to tween progress. |

State every default. `MaybeGetter<T>` inputs accept a plain value or a
`() => value` getter.

## Returns

| Field         | Type                  | Reactive | Description                                                                          |
| ------------- | --------------------- | -------- | ------------------------------------------------------------------------------------ |
| `scrollToTop` | `() => Promise<void>` | method   | Tween to `0`; resolves on completion (or without writing when superseded/cancelled). |
| `cancel`      | `() => void`          | method   | Abort any in-flight animation; safe when idle.                                       |
| `scrolling`   | `boolean`             | getter   | Whether an animation is running.                                                     |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useScrollToTop } from '@wynn-dev/svelte-use';

	const { scrollToTop, scrolling } = useScrollToTop();
</script>

<button onclick={scrollToTop} disabled={scrolling}>Back to top</button>
```

### SSR behavior

`scrollToTop()` resolves immediately on the server and without a target —
no DOM access, no timers, safe during SSR.

```ts
import { useScrollToTop } from '@wynn-dev/svelte-use';

// On the server: constructs fine, scrollToTop() is a no-op promise.
const { scrollToTop } = useScrollToTop();
await scrollToTop();
```

## Edge cases & cleanup

- A new `scrollToTop()` call supersedes any in-flight animation; only the
  latest run writes and settles `scrolling`.
- `cancel()` aborts in flight; the abandoned tween promise still settles
  later but performs no writes and touches no shared state (generation
  guarded).
- Unmounting disposes any in-flight animation: no leaked effect roots, no
  stale writes.
- Window detection is duck-typed (`scrollY`), so cross-realm windows
  (iframes) work where `instanceof Window` would fail.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- Custom API (no VueUse counterpart). VueUse's `useWindowScroll` only tracks
  position reactively; nothing there animates scrolling.
- `MaybeGetter<T>` instead of Vue's `MaybeRefOrGetter`; no promise rejection
  on cancel.
