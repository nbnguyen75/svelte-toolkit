# `useMousePressed`

Reactive press state, driven by mouse, touch, and HTML5 drag. Inspired by
[VueUse `useMousePressed`](https://vueuse.org/core/useMousePressed/).

## Signature

```ts
import { useMousePressed } from '@wynn-dev/svelte-use';

const { pressed, sourceType } = useMousePressed({ target: () => button });

console.log(pressed, sourceType); // true, 'mouse'
```

## Options

| Option         | Type                                                     | Default                                  | Description                                            |
| -------------- | -------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `touch`        | `boolean`                                                | `true`                                   | Also handle `touchstart` / `touchend` / `touchcancel`. |
| `drag`         | `boolean`                                                | `true`                                   | Also handle `dragstart` / `drop` / `dragend`.          |
| `capture`      | `boolean`                                                | `false`                                  | Attach listeners with `capture: true`.                 |
| `initialValue` | `boolean`                                                | `false`                                  | Starting press state.                                  |
| `target`       | `MaybeGetter<EventTarget \| null>`                       | `() => (isBrowser ? window : undefined)` | Element a press starts on.                             |
| `onPressed`    | `(event: MouseEvent \| TouchEvent \| DragEvent) => void` | no-op                                    | Called when a press starts.                            |
| `onReleased`   | `(event: MouseEvent \| TouchEvent \| DragEvent) => void` | no-op                                    | Called when the press ends.                            |

## Returns

| Field        | Type                         | Reactive | Description                                           |
| ------------ | ---------------------------- | -------- | ----------------------------------------------------- |
| `pressed`    | `boolean`                    | getter   | True from a press event until a release event.        |
| `sourceType` | `'mouse' \| 'touch' \| null` | getter   | Device that started the press; `null` while released. |

## Examples

### Press feedback

```svelte
<script lang="ts">
	import { useMousePressed } from '@wynn-dev/svelte-use';

	let el = $state<HTMLElement>();
	const { pressed } = useMousePressed({ target: () => el });
</script>

<button bind:this={el} class:pressed>hold me</button>
```

### Track the device

```svelte
<script lang="ts">
	import { useMousePressed } from '@wynn-dev/svelte-use';

	const { pressed, sourceType } = useMousePressed();
</script>

{#if pressed}
	<span>holding with {sourceType}</span>
{:else}
	<span>idle</span>
{/if}
```

### Side effects on press

```svelte
<script lang="ts">
	import { useMousePressed } from '@wynn-dev/svelte-use';

	const { pressed } = useMousePressed({
		target: () => el,
		onPressed: (event) => haptic(event),
		onReleased: () => reset()
	});
</script>
```

## Edge cases & cleanup

- **Press events come from the target; release events come from the window.**
  A press that ends outside the element — or outside the browser entirely — still
  has to clear the state, so `mouseup`, `mouseleave`, `touchend`, `touchcancel`,
  `drop`, and `dragend` are all bound to the window.
- **`mouseleave` is a release trigger.** The pointer leaving the window while
  held would otherwise strand `pressed` at `true` forever.
- **`touchcancel` is a release trigger**, not just `touchend`. A gesture the
  browser takes over — a scroll, a system pinch — never fires `touchend`.
- **`drop` and `dragend` are both release triggers**, so a drag dropped outside
  any drop target still clears.
- **A drag reports `sourceType: 'mouse'`.** It is a mouse gesture as far as the
  user is concerned, matching VueUse.
- **`touch: false` / `drag: false` skip their listeners entirely**, so a
  touch-only device never registers a single handler.
- **`capture: true` observes a press before descendants can stop it**, which is
  the point of the option.
- **Callbacks run before the state flips.** `onPressed` sees `pressed` still
  `false` and `onReleased` sees it still `true`, matching VueUse — a callback
  that measures the element gets the pre-transition value.
- **Listeners are `passive`**, since none of them call `preventDefault`.
- Every listener is released on unmount; no state is written after teardown.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- `pressed` and `sourceType` are read-only getters rather than writable refs. A
  caller asserting a synthetic press would bypass every listener, so the state
  only ever reflects real input.
- No `window` option: the release listeners always target the real window, and
  the SSR guards come from `isBrowser` instead of a nullable config.
- The deprecated `MousePressedOptions` alias is dropped; `UseMousePressedOptions`
  is the name.
