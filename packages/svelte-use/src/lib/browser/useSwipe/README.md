# useSwipe

Reactive swipe detection: which way a touch travelled, and how far.
Dependency-free.

## Usage

```svelte
<script lang="ts">
	import { useSwipe } from '@wynn-dev/svelte-use';

	let el: HTMLDivElement;
	const swipe = useSwipe(() => el, {
		passive: false,
		onSwipeEnd: (_, direction) => {
			if (direction === 'left') next();
			else if (direction === 'right') previous();
		}
	});
</script>

<div bind:this={el}>{swipe.isSwiping ? swipe.direction : 'idle'}</div>
```

## Returns

| Field                       | What it is                                         |
| --------------------------- | -------------------------------------------------- |
| `isSwiping`                 | Threshold met, finger still down                   |
| `direction`                 | `'up'`, `'down'`, `'left'`, `'right'`, or `'none'` |
| `coordsStart` / `coordsEnd` | Where the touch began / last was                   |
| `lengthX` / `lengthY`       | Distance travelled, **signed**                     |
| `stop()`                    | Stop listening now                                 |

All are getters, so reading one in a template tracks it.

**`lengthX` and `lengthY` are signed, and positive means the finger went the
other way.** `lengthX` is `start.x - end.x`, so swiping left 100 gives `+100`
and swiping right 100 gives `-100`. That is VueUse's arithmetic, kept as-is:
it falls out of comparing the two coordinates, and it makes `direction` a
two-line function instead of a sign lookup. Use `direction` unless you need the
magnitude, and take `Math.abs` if you do.

## Threshold

A touch has to travel `threshold` pixels (50 by default) before it counts, so a
tap is not a swipe. Exactly the threshold counts — the comparison is `>=`.

Ties go to the vertical axis: a 50/50 diagonal reads as `down`, matching
VueUse.

```ts
useSwipe(() => el, { threshold: 30 });
```

A getter is re-read on every move, so the threshold can tighten mid-gesture.

## `passive`

`passive: true` by default, which is faster — the browser can start scrolling
without waiting for your handler. The cost is that `preventDefault()` is
ignored, so a horizontal swipe will scroll the page sideways as well as
navigating.

Turn it off when the swipe owns the gesture:

```ts
useSwipe(() => el, { passive: false });
```

Only the **horizontal** axis is ever prevented. A vertical move is a scroll, and
stopping it would make a carousel impossible to scroll past.

`passive` is read when the listeners bind, because it is fixed when a listener
binds — a listener created passive can never be made non-passive. A getter that
reads reactive state therefore takes effect by re-binding.

## Multi-touch

A touch with more than one finger is ignored: a pinch is not a swipe. This
applies to both the start and the moves, so a second finger landing mid-swipe
stops the reading rather than jumping it.

## Caveats

- Touch events only. There is no mouse or pen path — for a pointer, use
  [`usePointer`](../usePointer/README.md) and compare coordinates yourself.
  If you need both, this is still the right base: the threshold and direction
  arithmetic are the fiddly part.
- `touchend` clears `isSwiping` but **not** the coordinates, so `direction` and
  `lengthX` / `lengthY` keep reporting the last movement after the finger lifts.
  VueUse behaves the same way, and it is what you want in `onSwipeEnd` — the
  final direction is still readable there. The next `touchstart` resets both.
- `onSwipeStart` fires on the first touch, before the threshold is met. A tap
  calls it too.
- `stop()` is one-way: nothing re-binds until `target` changes.
- Listeners are removed on unmount, so `stop()` is only needed to end a swipe
  early.

## Type

```ts
function useSwipe(
	target: MaybeGetter<EventTarget | null | undefined>,
	options?: UseSwipeOptions
): UseSwipeReturn;
```
