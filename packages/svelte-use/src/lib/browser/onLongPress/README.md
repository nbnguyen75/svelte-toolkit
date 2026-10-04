# onLongPress

Call a handler when an element is pressed and held — the long-press gesture
behind a context menu, a press-and-drag tile, a haptic nudge.

## Usage

```svelte
<script lang="ts">
	import { onLongPress } from '@wynn-dev/svelte-use';

	let tile: HTMLDivElement;
	const stop = onLongPress(
		() => tile,
		() => openMenu(),
		{ delay: 700, distanceThreshold: 20 }
	);
</script>

<div bind:this={tile}>…</div>
```

The handler receives the `pointerdown` event that started the press, not a
timer event. By the time the delay elapses, that is the event that explains why
anything is happening.

## Drifting cancels the press

A press that moves more than `distanceThreshold` pixels from where it went down
has become a drag, so the pending handler is dropped. Distance is measured
diagonally — 8px right and 8px down is 11.3px of drift, past the 10px default,
even though neither axis got there.

Pass `distanceThreshold: false` to allow any movement.

## `onMouseUp`

Called on release, however the press ended — `pointerup`, `pointerleave`, or
`pointercancel` — with how long the element was held, how far the pointer
drifted, whether the handler had already run, and the event.

```ts
onMouseUp(duration, distance, isLongPress, event);
```

A press abandoned for drifting still reports, with `isLongPress: false`. VueUse
stays silent in that case, which leaves a caller waiting on the release with no
way to hear back when the user drags off.

## `modifiers.once`

Run the handler at most once, ever. Unlike VueUse's version it survives a press
that was abandoned: a native `once` listener is removed the moment it fires,
which would leave the element deaf to every later press.

## Type

```ts
function onLongPress(
	target: MaybeGetter<MaybeHTMLElement>,
	handler: (event: PointerEvent) => void,
	options?: OnLongPressOptions
): () => void;

interface OnLongPressOptions {
	delay?: number | ((event: PointerEvent) => number) | undefined;
	distanceThreshold?: number | false | undefined;
	modifiers?: OnLongPressModifiers | undefined;
	onMouseUp?:
		| ((duration: number, distance: number, isLongPress: boolean, event: PointerEvent) => void)
		| undefined;
}

interface OnLongPressModifiers {
	stop?: boolean | undefined;
	once?: boolean | undefined;
	prevent?: boolean | undefined;
	capture?: boolean | undefined;
	self?: boolean | undefined;
}
```

`delay` may be a function of the `pointerdown`, so a press can decide its own
timeout — longer for a small target, say.

## Caveats

- Listens on pointer events, so a mouse, pen, and touch all work, and a
  touchscreen long press does not first have to wait out the browser's own
  context menu or text-selection delay. Call `preventDefault` through
  `modifiers.prevent` if you want to suppress those on the element.
- `modifiers.self` ignores presses that start on a descendant, which is the one
  way to narrow a long press to one element in a list.
- The returned function detaches the listeners and cancels a press in flight.
  It is safe to call outside a component.
