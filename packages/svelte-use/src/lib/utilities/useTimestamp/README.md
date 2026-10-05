# useTimestamp

Reactive epoch-milliseconds clock, replaced on every animation frame, with
`pause` / `resume` controls and an `offset`. Dependency-free.

## Usage

```svelte
<script lang="ts">
	import { useTimestamp } from '@wynn-dev/svelte-use';

	const { timestamp, pause } = useTimestamp({
		callback: (value) => console.log(value)
	});
</script>

<p>{new Date(timestamp).toLocaleTimeString()}</p>
<button onclick={pause}>Freeze</button>
```

## Options

| Option     | Default | What it is                                             |
| ---------- | ------- | ------------------------------------------------------ |
| `offset`   | `0`     | Milliseconds added to every reported value             |
| `callback` | —       | Called with each new value, after the state is updated |

## Returns

| Field       | What it is                               |
| ----------- | ---------------------------------------- |
| `timestamp` | Current epoch milliseconds plus `offset` |
| `isActive`  | Whether the frame loop is running        |
| `pause`     | Freeze the clock where it stands         |
| `resume`    | Restart the clock                        |

`timestamp` and `isActive` are getters, so reading them in a template tracks
them.

## `offset` is the point of this util

Subtracting your UTC offset turns epoch milliseconds into local time without
touching `Date`:

```ts
// eight hours behind UTC, i.e. US Eastern time
useTimestamp({ offset: -8 * 60 * 60 * 1000 });
```

Pass the opposite sign to get local time anywhere, and read the real zone from
`Intl.DateTimeFormat().resolvedOptions().timeZone` rather than hard-coding one.

## Caveats

- **Milliseconds, from `Date.now()`, not the frame timestamp.** A frame timestamp
  is relative to the page's start and drifts from the wall clock; epoch
  milliseconds are the thing you can store, compare and send.
- **The same value can repeat.** The clock has millisecond resolution and frames
  arrive faster than that on a high-refresh display, so two consecutive frames
  can legitimately report the same number. Nothing is missed.
- **A new number every frame regardless.** The state is written on every frame
  even when the value is unchanged, so a template reading it re-renders every
  frame. That is deliberate: a `Date` object is replaced every frame anyway, and
  skipping equal writes would make the util's update cadence depend on
  something the caller cannot see.
- **Read `isActive` off the returned object.** `const { isActive } =
useTimestamp()` copies the boolean once and it will never update.
- **Pausing holds the value; it does not catch up.**
- **The loop is dropped on unmount**, and the callback stops with it.
- **No `requestAnimationFrame`, no loop.** On the server the value is the
  render-time clock, `isActive` stays `false`, `callback` never fires, and the
  controls remain callable no-ops.

## Differences from VueUse

**VueUse takes `controls` and `scheduler`; neither exists here.**

- `controls: false` (the default) returned a bare ref and `controls: true`
  returned `{ timestamp, ...Pausable }` — two return shapes for one function.
  The controls are always returned.
- `scheduler` swapped `useRafFn` for a timer-based scheduler. No shipped util in
  this package accepts a scheduler, and the loop here is `useRafFn` directly.

So the options are just `offset` and `callback`.
