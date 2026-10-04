# useDraggable

Make an element draggable. Dependency-free.

The press is heard on the target, the drag on `window`, so a drag survives the
pointer leaving the element — which it always does.

## Usage

```svelte
<script lang="ts">
	import { useDraggable } from '@wynn-dev/svelte-use';

	let card: HTMLDivElement;
	const drag = useDraggable(() => card, { axis: 'y' });
</script>

<div bind:this={card} style:left="{drag.x}px" style:top="{drag.y}px">…</div>
```

Or take `style` whole, which is a `left` / `top` declaration:

```svelte
<div bind:this={card} style={drag.style}>…</div>
```

`position` is the **offset from where the element already is**, not a
coordinate, so an element that starts in normal flow does not jump to the
pointer on the first move.

## Returns

| Field        | What it is                                      |
| ------------ | ----------------------------------------------- |
| `x` / `y`    | The offsets, in pixels                          |
| `position`   | Both. Mutating it moves the element             |
| `isDragging` | Whether a press is in progress                  |
| `style`      | `left: …px; top: …px;` for the current position |

All five are getters, so reading them in a template or a `$derived` tracks the
drag. Destructuring copies the value once — read `drag.position`, not
`const { position } = useDraggable(...)`.

## Dragging inside a container

`containerElement` makes `position` relative to that element instead of to the
viewport, and clamps the drag to the container's scroll area:

```ts
useDraggable(() => card, { containerElement: () => board });
```

`position` then means "pixels from the container's visible top-left corner,
plus its scroll", so it composes with a scrolled board without any arithmetic
in `onMove`.

**The container is expected to be a scroll container.** VueUse clamps against
`scrollWidth` / `scrollHeight` whenever a container is set, so a container with
no scroll area — a `0 × 0` one, or a plain `div` — pins the element at the
origin. That is faithful rather than useful-by-accident: if you pass a
container, you meant the element to be bounded by it.

`restrictInView` tightens that to the **visible** area, so the element cannot
be dragged off the visible edge even though the content extends past it.

## `handle`

Start the drag from something other than the dragged element — the grip in the
corner of a card, so that a click on the card's body does something else:

```ts
useDraggable(() => card, { handle: () => grip });
```

`exact` is the narrower version of the same idea: the press must land on the
target itself, not on a descendant.

## Refusing a drag

`onStart` returning `false` refuses it, which is how you make a drag
conditional — a locked card, an element already at its limit:

```ts
useDraggable(() => card, { onStart: (position) => canMove(position) || false });
```

`disabled` is the simpler switch, read on every press, so it takes effect
immediately when a getter returns a new value.

## Options

| Option             | Default  | What it does                                           |
| ------------------ | -------- | ------------------------------------------------------ |
| `initialValue`     | `{0,0}`  | Where the element starts. Read once, not per drag      |
| `axis`             | `'both'` | `'x'`, `'y'`, or `'both'`                              |
| `handle`           | `target` | Element whose press starts the drag                    |
| `containerElement` | —        | Element the drag is measured and clamped against       |
| `draggingElement`  | `window` | Where the move and release are heard                   |
| `exact`            | `false`  | Press must land on the target itself                   |
| `disabled`         | `false`  | Refuse every press                                     |
| `buttons`          | `[0]`    | Mouse buttons that may start a drag                    |
| `pointerTypes`     | all      | Pointer kinds that may drag                            |
| `capture`          | `true`   | Listen in the capture phase                            |
| `preventDefault`   | `false`  | `preventDefault` on the events handled                 |
| `stopPropagation`  | `false`  | `stopPropagation` on the events handled                |
| `restrictInView`   | `false`  | Keep the element inside the container's _visible_ area |
| `onStart`          | —        | Called on press. Return `false` to refuse              |
| `onMove`           | —        | Called on every move                                   |
| `onEnd`            | —        | Called on release                                      |

Options that can change while the util is alive (`disabled`, `exact`,
`buttons`, `restrictInView`, `preventDefault`, `stopPropagation`) take a
getter as well as a value, and are read per event.

`initialValue` is the exception: it is read once, so a drag always starts from
wherever the element was left.

## Not ported: `autoScroll`

VueUse can scroll a container for you when the drag reaches its edge — a
60fps interval, plus an option object with four more knobs (`speed`, `margin`,
`direction`) and a position correction on every frame. That is a feature
bundled into a drag util rather than part of dragging, and it is the one part
of VueUse's implementation that would have needed its own tests to be
believable. It is not here.

Do it in `onMove` instead, where you can see the edges yourself:

```ts
useDraggable(() => card, {
	containerElement: () => board,
	onMove(position) {
		const edge = 30;
		if (position.y < edge) board.scrollTop -= 8;
		else if (position.y > board.clientHeight - edge) board.scrollTop += 8;
	}
});
```

## Caveats

- Pointer events are implicitly captured to the press target, so a drag keeps
  reporting outside the window in every browser that supports them. This is why
  `window` is the default `draggingElement` and why nothing here needs a
  `setPointerCapture`.
- A press on the target starts a drag even if the pointer never moves, so a
  plain click is a zero-length drag. `onMove` is what tells them apart.
- The listeners are removed when the effect that owns them is destroyed —
  unmount, or the target changing. There is no `stop()`, because there is
  nothing to stop early that unmount does not already do.
- `draggingElement` falls back to `window` when it is nullish, which is not
  VueUse's behaviour: it binds nothing. Here a nullish element usually means a
  target that has not resolved yet, and binding `window` means the drag works
  the moment it does. Use `disabled` to switch dragging off.

## Type

```ts
function useDraggable(
	target: MaybeGetter<MaybeElement>,
	options?: UseDraggableOptions
): UseDraggableReturn;
```

`target` and `handle` accept any `Element`, SVG included.
