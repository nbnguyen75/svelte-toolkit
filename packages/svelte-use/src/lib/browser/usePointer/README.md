# usePointer

Reactive pointer state: position, pressure, tilt, contact geometry, and
whether the pointer is inside the target. Dependency-free.

The pressure and tilt fields are the point. A mouse has none of them, so
anything that wants a pencil to press harder than a finger needs one listener
covering every pointer kind rather than separate mouse and touch paths.

## Usage

```svelte
<script lang="ts">
	import { usePointer } from '@wynn-dev/svelte-use';

	let canvas: HTMLCanvasElement;
	const pointer = usePointer({ target: () => canvas });
</script>

<canvas bind:this={canvas}></canvas><p>x {pointer.x}, y {pointer.y}, pressure {pointer.pressure}</p>
```

With no `target` it listens on `window`, which is what you want for a
full-page overlay or a cursor follower.

## Returns

| Field              | What it is                                                       |
| ------------------ | ---------------------------------------------------------------- |
| `x` / `y`          | Client coordinates — `MouseEvent.x`, not `clientX`               |
| `pressure`         | `0` not pressing, `0.5` for a mouse button, `1` for full contact |
| `tiltX` / `tiltY`  | Tilt in degrees. Always `0` for a mouse                          |
| `width` / `height` | Contact geometry in CSS pixels. `1` for a mouse                  |
| `twist`            | Barrel rotation in degrees                                       |
| `pointerId`        | Which pointer this is                                            |
| `pointerType`      | `'mouse'`, `'pen'`, `'touch'`, or `null` before the first event  |
| `isInside`         | Whether the target has seen the pointer                          |

All eleven are getters, so reading one in a template tracks it. Destructuring
copies the value once — read `pointer.x`, not `const { x } = usePointer()`.

State is replaced wholesale on each event, so nothing is ever carried over: a
field you do not read on the next event is zero again, not stale.

## `pointerTypes`

Every pointer kind is reported unless you narrow it:

```ts
usePointer({ pointerTypes: ['pen'] }); // ignore mouse and touch
```

Read on every event, so a getter switches filtering live:

```ts
usePointer({ pointerTypes: () => (drawing ? ['pen', 'touch'] : []) });
```

**A filtered-out pointer still sets `isInside`.** VueUse orders it that way, and
it is the useful order: "is a pointer over this element" is a question about
position, not about whether you care about that kind. If you were counting
pens hovering a target, filter afterwards on `pointer.pointerType`.

## `target`

`window` by default. Name a target to listen on that element instead:

```ts
usePointer({ target: () => canvas });
```

A getter that returns a new element re-binds. A target that is _nullish_ binds
nothing — not `window` — so a target that has not resolved yet cannot silently
widen the scope to the whole page. This is deliberately the opposite of
[`useDraggable`](../useDraggable/README.md), where the fallback is safe because
a drag is already listening on `window`; here it would report pointers the
caller never asked about. Omitting `target` entirely still means `window`.

`initialValue` sets the fields reported before the first pointer event, which
is what a server render and the first client paint both read:

```ts
usePointer({ initialValue: { x: 0, y: 0, pointerType: 'mouse' } });
```

## Caveats

- `x` / `y` are viewport coordinates, so they need no target rect and do not
  account for scrolling or zoom. Subtract the element's `getBoundingClientRect()`
  yourself if you want position within it — or use
  [`useMouse`](../useMouse/README.md), which resolves the position against the
  element and can follow a scroll.
- `pressure` is only meaningful while pressing. A hover reports `0` for a pen
  too, so `pressure > 0` is the test for "touching the surface", not "present".
- `width` / `height` are the contact geometry, not the element's size. They are
  `1` for every mouse, whatever its sensor.
- `pointerleave` and `pointercancel` clear `isInside` but leave the last known
  position alone: where the pointer was is still where it was, and a caller
  tracking a drag needs that.
- Listeners are removed when the effect that owns them is destroyed — unmount,
  or the target changing. There is no `stop()`.
- `pointerType` is typed `string`, not `'mouse' | 'pen' | 'touch'`. The DOM
  types it as `string` because a device may report a name of its own; VueUse
  narrows it with a cast, which is why its union is a lie the runtime can
  break. Widening it here means `pointerTypes: ['eraser']` compiles.

## Type

```ts
function usePointer(options?: UsePointerOptions): UsePointerReturn;
```
