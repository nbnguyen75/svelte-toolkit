# `useTextareaAutosize`

Grows a textarea to fit its content.
Inspired by [VueUse `useTextareaAutosize`](https://vueuse.org/core/useTextareaAutosize/).

## Signature

```ts
import { useTextareaAutosize } from '@wynn-dev/svelte-use';

let value = $state('');
let area = $state<HTMLTextAreaElement>();
useTextareaAutosize({ element: () => area, input: () => value });
```

## Options

| Option        | Type                                       | Default      | Description                                                      |
| ------------- | ------------------------------------------ | ------------ | ---------------------------------------------------------------- |
| `element`     | `MaybeGetter<HTMLTextAreaElement \| null>` | `null`       | Textarea to size. A getter is re-read on every effect run.       |
| `input`       | `MaybeGetter<string>`                      | `''`         | Current content, or a getter for it. Drives the resize.          |
| `maxHeight`   | `MaybeGetter<number \| undefined>`         | `undefined`  | Upper bound in pixels. Content still scrolls past it.            |
| `styleTarget` | `MaybeGetter<HTMLElement \| null>`         | the textarea | Element to write the height to, for styling a wrapper instead.   |
| `styleProp`   | `'height' \| 'minHeight'`                  | `'height'`   | Which property to write. Use `minHeight` when CSS owns `height`. |
| `onResize`    | `() => void`                               | —            | Called after the measured height changes.                        |

## Returns

| Field           | Type         | Reactive | Description                                            |
| --------------- | ------------ | -------- | ------------------------------------------------------ |
| `triggerResize` | `() => void` | —        | Re-measure and re-apply the height now.                |
| `scrollHeight`  | `number`     | getter   | Last measured `scrollHeight`, or `0` before the first. |

## Examples

### Auto-growing textarea

```svelte
<script lang="ts">
	import { useTextareaAutosize } from '@wynn-dev/svelte-use';

	let value = $state('');
	let area = $state<HTMLTextAreaElement>();
	useTextareaAutosize({ element: () => area, input: () => value });
</script>

<textarea bind:this={area} bind:value rows="1"></textarea>
```

### Grow up to a ceiling, then scroll

```svelte
<script lang="ts">
	import { useTextareaAutosize } from '@wynn-dev/svelte-use';

	let value = $state('');
	let area = $state<HTMLTextAreaElement>();
	useTextareaAutosize({ element: () => area, input: () => value, maxHeight: 200 });
</script>

<textarea bind:this={area} bind:value rows="1"></textarea>
```

### Size a wrapper so a fade-out is not clipped

```svelte
<script lang="ts">
	import { useTextareaAutosize } from '@wynn-dev/svelte-use';

	let value = $state('');
	let area = $state<HTMLTextAreaElement>();
	let wrapper = $state<HTMLDivElement>();
	useTextareaAutosize({
		element: () => area,
		input: () => value,
		styleTarget: () => wrapper,
		styleProp: 'minHeight'
	});
</script>

<div bind:this={wrapper} class="field">
	<textarea bind:this={area} bind:value rows="1"></textarea>
</div>
```

### Report growth to an analytics hook

```svelte
<script lang="ts">
	import { useTextareaAutosize } from '@wynn-dev/svelte-use';

	let value = $state('');
	let area = $state<HTMLTextAreaElement>();
	const autosize = useTextareaAutosize({
		element: () => area,
		input: () => value,
		onResize: () => trackHeight(autosize.scrollHeight)
	});
</script>
```

## Edge cases & cleanup

- **The height collapses to `1px` before measuring.** `scrollHeight` otherwise
  reports the height a previous pass left behind, and the textarea would only
  ever grow.
- **`scrollHeight` is the measurement, not the applied style.** With a
  `maxHeight`, the getter still reports the uncapped content height, so the real
  overflow stays observable.
- **`styleTarget` receives the final height while the textarea stays collapsed.**
  That is what lets a wrapper clip a fade-out without the textarea re-measuring
  against its own new height.
- **Only a width change triggers a resize.** The height notification is the one
  this util caused, so reacting to it would loop.
- **Changing `input`, `element`, or `maxHeight` re-measures** on the next tick.
  Pass them as getters — a plain value is a snapshot.
- **`onResize` fires only after a real measurement,** so a `null` element never
  calls it.
- **No element means no measurement:** `scrollHeight` stays `0` and
  `triggerResize()` is a no-op.
- **A missing `ResizeObserver` is not an error** — the content-driven effect
  still sizes the textarea, it just will not follow a width change.
- **Unmounting disconnects the observer.**
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- **No `watch` option.** VueUse exposes a manual re-measure list; a getter for
  `input` is the reactive version of the same thing, and `triggerResize()` covers
  the imperative case.
- **`maxHeight` is an addition**, not a VueUse option: VueUse relies on CSS
  `max-height` on the element. The inline form is here because it is the common
  need and it is three lines; CSS `max-height` on the textarea works too.
- **VueUse wraps the measurement in `nextTick`.** `$effect` already runs after
  the DOM is updated, so that wrapper would only add a frame of lag.
- **The observer is an inline one-element `ResizeObserver`,** which becomes
  feat-017's `useResizeObserver` / `onElementResize` once those land.
- No `styleTarget` default surprises: when it is `null` the height is written to
  the textarea itself.
