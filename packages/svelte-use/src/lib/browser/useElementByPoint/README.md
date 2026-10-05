# `useElementByPoint`

Reactive element under a point, hit-tested once per animation frame.
Inspired by
[VueUse `useElementByPoint`](https://vueuse.org/core/useElementByPoint/).

## Signature

```ts
import { useElementByPoint } from '@wynn-dev/svelte-use';

const { element } = useElementByPoint({ x: () => cursor.x, y: () => cursor.y });

console.log(element?.tagName);
```

## Options

| Option     | Type                         | Default | Description                                    |
| ---------- | ---------------------------- | ------- | ---------------------------------------------- |
| `x`        | `number \| (() => number)`   | —       | Viewport X to hit-test. Read every frame.      |
| `y`        | `number \| (() => number)`   | —       | Viewport Y to hit-test. Read every frame.      |
| `multiple` | `boolean \| (() => boolean)` | `false` | Return every element under the point, not one. |

Both coordinates are read on **every frame**, so a getter tracks a moving cursor.
A plain value works too, and is read once per frame like any other.

## Returns

| Field         | Type                                    | Reactive | Description                                                       |
| ------------- | --------------------------------------- | -------- | ----------------------------------------------------------------- |
| `element`     | `Element \| readonly Element[] \| null` | getter   | The hit element, or the array when `multiple`.                    |
| `isActive`    | `boolean`                               | getter   | Whether the frame loop is running.                                |
| `isSupported` | `boolean`                               | getter   | Whether the current `multiple` mode can hit-test. `false` in SSR. |
| `pause`       | `() => void`                            | —        | Stop hit-testing until `resume`.                                  |
| `resume`      | `() => void`                            | —        | Start (or restart) hit-testing.                                   |

## Examples

### Follow the cursor

```svelte
<script lang="ts">
	import { useElementByPoint } from '@wynn-dev/svelte-use';

	let cursor = $state({ x: 0, y: 0 });
	const { element } = useElementByPoint({
		x: () => cursor.x,
		y: () => cursor.y
	});
</script>

<div onpointermove={(e) => (cursor = { x: e.clientX, y: e.clientY })}>
	{element?.tagName ?? 'nothing'}
</div>
```

### Every element in the stack

```svelte
<script lang="ts">
	import { useElementByPoint } from '@wynn-dev/svelte-use';

	let cursor = $state({ x: 0, y: 0 });
	// Bottom-to-top, the way the platform orders them.
	const { element } = useElementByPoint({
		x: () => cursor.x,
		y: () => cursor.y,
		multiple: true
	});
</script>

<ul>
	{#each element ?? [] as el (el)}
		<li>{el.tagName.toLowerCase()}</li>
	{/each}
</ul>
```

### Suspend while the panel is closed

```svelte
<script lang="ts">
	import { useElementByPoint } from '@wynn-dev/svelte-use';

	let open = $state(false);
	let cursor = $state({ x: 0, y: 0 });
	const { element, pause, resume } = useElementByPoint({
		x: () => cursor.x,
		y: () => cursor.y
	});

	$effect(() => {
		if (open) resume();
		else pause();
	});
</script>
```

## Edge cases & cleanup

- **The hit test runs per animation frame**, never per pointer event. A
  `pointermove` fires far more often than the screen updates, and
  `elementFromPoint` is a layout query, so per-event hit testing is a forced
  layout per event.
- **`isSupported` reflects the current `multiple` mode.** `elementsFromPoint` is
  checked when `multiple` is on and `elementFromPoint` when it is off, because a
  browser can expose one and not the other.
- **Support is probed with `typeof`, not `in`.** A document can expose the name
  and leave it `undefined`; `in` accepts that and the call then throws.
- **`element` stays `null` before the first frame**, and whenever the document
  cannot hit-test. It is never set to a guess.
- **`multiple: true` yields an array even when the point hits nothing** — that is
  what the platform returns, and downgrading it would be the util's invention.
- **Must be called in component initialization** (uses `$state` / `$effect`).
- `pause()` cancels the pending frame; `resume()` starts a fresh loop and resets
  the frame delta, so the first frame after a resume does not report a huge delta.

## Parity notes

- **Composes the shipped `useRafFn`**, so there is no second frame scheduler in
  the package. `Pausable` from upstream is that util's own return shape.
- **`isSupported` is a getter, not a snapshot.** `multiple` is a getter too, so a
  one-time boolean would report support for a mode that is not the one running.
- **`element` is typed `Element`, not `HTMLElement`.** `elementFromPoint` is typed
  as `Element | null`, and narrowing it further would be a lie about SVG nodes.
