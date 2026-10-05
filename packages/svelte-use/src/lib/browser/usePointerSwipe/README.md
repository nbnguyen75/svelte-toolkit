# `usePointerSwipe`

Reactive swipe detection from `PointerEvent`s, which unifies mouse, touch and
pen. Inspired by
[VueUse `usePointerSwipe`](https://vueuse.org/core/usePointerSwipe/).

## Signature

```ts
import { usePointerSwipe } from '@wynn-dev/svelte-use';

const { isSwiping, direction } = usePointerSwipe(() => carousel);

console.log(isSwiping, direction);
```

## Options

| Option              | Type                              | Default | Description                                     |
| ------------------- | --------------------------------- | ------- | ----------------------------------------------- |
| `threshold`         | `number \| (() => number)`        | `50`    | Pixels to travel before it counts as a swipe.   |
| `pointerTypes`      | `('mouse' \| 'touch' \| 'pen')[]` | —       | Pointer kinds to accept.                        |
| `disableTextSelect` | `boolean`                         | `false` | Set `user-select: none` on the target.          |
| `onSwipeStart`      | `(event: PointerEvent) => void`   | —       | On the pointerdown that starts a swipe.         |
| `onSwipe`           | `(event: PointerEvent) => void`   | —       | On each move, once the threshold is met.        |
| `onSwipeEnd`        | `(event, direction) => void`      | —       | On release or cancel, with the final direction. |

`threshold` is read on **every move**, so a getter takes effect immediately.

## Returns

| Field       | Type                | Reactive | Description                                      |
| ----------- | ------------------- | -------- | ------------------------------------------------ |
| `isSwiping` | `boolean`           | getter   | Threshold met and the pointer is still down.     |
| `direction` | `UseSwipeDirection` | getter   | `'up' \| 'down' \| 'left' \| 'right' \| 'none'`. |
| `posStart`  | `Position`          | getter   | Where the pointer went down.                     |
| `posEnd`    | `Position`          | getter   | Where the pointer last was.                      |
| `distanceX` | `number`            | getter   | Horizontal travel. Positive is left.             |
| `distanceY` | `number`            | getter   | Vertical travel. Positive is up.                 |
| `stop`      | `() => void`        | —        | Stop listening until the target changes.         |

`distanceX` is `start - end`, so a positive value means the pointer travelled
**left**. "Travelled 30 left" and "travelled 30 right" are different answers, so
the sign is kept.

## Examples

### Carousel

```svelte
<script lang="ts">
	import { usePointerSwipe } from '@wynn-dev/svelte-use';

	let track = $state<HTMLDivElement>();
	const swipe = usePointerSwipe(() => track, {
		threshold: 30,
		disableTextSelect: true,
		onSwipeEnd: (_, direction) => {
			if (direction === 'left') next();
			else if (direction === 'right') previous();
		}
	});
</script>

<div bind:this={track} class:swiping={swipe.isSwiping}>
	{swipe.direction}
</div>
```

### Accept pen and touch only

```svelte
<script lang="ts">
	import { usePointerSwipe } from '@wynn-dev/svelte-use';

	let board = $state<HTMLDivElement>();
	// A mouse drag is usually a text selection, not a swipe.
	const { direction } = usePointerSwipe(() => board, {
		pointerTypes: ['touch', 'pen']
	});
</script>

<div bind:this={board}>{direction}</div>
```

## Edge cases & cleanup

- **Pointer capture is requested on `pointerdown`.** Without it, a swipe that
  drifts off the element gets its moves re-targeted at whatever is underneath and
  stops reporting mid-gesture.
- **`touch-action: pan-y` is set on the target**, so the browser keeps owning
  vertical scroll gestures and hands horizontal intent to the handler.
- **Listeners are passive.** Nothing here calls `preventDefault`, and
  `touch-action` is what actually suppresses the browser's own panning.
- **`pointercancel` ends the swipe the same way `pointerup` does**, calling
  `onSwipeEnd` with the direction reached so far.
- **`pointerup` is not re-filtered on "a button is down".** A real mouse `up`
  reports `buttons: 0`, so re-applying the down-event filter would drop it and
  leave `isSwiping` stuck on.
- **Moves before any `pointerdown` are ignored**, so a cursor crossing the element
  does not start a swipe.
- **Without `pointerTypes`, a mouse must have a button down** and a touch or pen
  only has to be touching — the platform's own signal, rather than a guess.
- **`stop()` detaches all four listeners.** It does not re-arm automatically; a
  changed `target` does.
- **A target with no `style` or no `setPointerCapture` is tolerated** — a
  detached `EventTarget`, or a node from another realm.
- Must be called in component initialization (uses `$state` / `$derived` /
  `$effect`).

## Parity notes

- **`threshold` is a `MaybeGetter`**, which upstream's `number` is not. A plain
  number still works; this only adds the ability to follow reactive state.
- **`UseSwipeDirection` is reused from `useSwipe`** rather than redeclared, so the
  two utils cannot drift apart. It is re-exported from neither, because
  `useSwipe` already exports it once.
- **`isPointerDown` is internal.** Upstream exposes only `isSwiping`, but a move
  needs to know a button is still down independently of the threshold.
- **The text-selection styles are set on bind**, not at setup, so a `target` that
  resolves later still gets them.
- **`stop()` binds through the internal `bindListener`**, because the public
  `useEventListener` returns nothing and `stop()` needs the detachers.
