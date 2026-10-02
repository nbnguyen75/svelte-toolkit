# `useFps`

Measure rendering FPS over a window of animation frames.
Inspired by [VueUse `useFps`](https://vueuse.org/shared/useFps/).

## Signature

```ts
import { useFps } from '@wynn-dev/svelte-use';

const fps = useFps();
fps.value; // measured frames per second
```

## Parameters

| Parameter | Type            | Default | Description |
| --------- | --------------- | ------- | ----------- |
| `options` | `UseFpsOptions` | `{}`    | See below.  |

| Option  | Type     | Default | Description                                                                            |
| ------- | -------- | ------- | -------------------------------------------------------------------------------------- |
| `every` | `number` | `10`    | Frames per sample window; the average is recomputed each time this many frames elapse. |

## Returns

| Field   | Type     | Description                                                            |
| ------- | -------- | ---------------------------------------------------------------------- |
| `value` | `number` | Latest measured FPS (`0` before the first full window). Getter-backed. |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useFps } from '@wynn-dev/svelte-use';

	const fps = useFps();
</script>

<p>{fps.value} fps</p>
```

### Wider sampling window

```ts
// Average over 30 frames: steadier, but slower to react to a change.
const fps = useFps({ every: 30 });
```

## SSR behavior

`performance` is checked before the frame loop is created, so no loop is built at
all in an environment without it. Under SSR the loop underneath stays inert
regardless, so `value` remains `0` — a server render never samples a clock that
does not advance.

## Edge cases & cleanup

- The frame loop is cancelled on unmount.
- `value` stays `0` until a **full** window of `every` frames has elapsed; there
  is no partial-window reading.
- Sampling reads `performance.now()`, not the frame timestamp. A background tab
  throttles frames, and the wall-clock gap is what the number means to a reader.
- The value is rounded to an integer, matching VueUse — it is a readout, not a
  measurement you should average yourself.
- No controls are exposed; the loop runs while the component is mounted. Use
  `useRafFn` directly if you need `resume` / `pause`.

## Parity notes

- VueUse returns a `{ fps }` ref. This port returns `{ value }` as a getter-backed
  readonly, matching this package's `value` convention.
- Both sample on `performance.now()` with the same `every`-frame window and
  integer rounding, so numbers are comparable.
