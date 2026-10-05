# useNow

Reactive `Date`, replaced on every animation frame, with `pause` / `resume`
controls. Dependency-free.

## Usage

```svelte
<script lang="ts">
	import { useNow } from '@wynn-dev/svelte-use';

	const { now, pause, resume } = useNow();
</script>

<p>{now.toLocaleTimeString()}</p>
<button onclick={pause}>Freeze</button>
<button onclick={resume}>Resume</button>
```

## Returns

| Field      | What it is                                    |
| ---------- | --------------------------------------------- |
| `now`      | The current date; a new `Date` on every frame |
| `isActive` | Whether the frame loop is running             |
| `pause`    | Freeze the loop where it stands               |
| `resume`   | Restart the loop                              |

`now` and `isActive` are getters, so reading them in a template tracks them.

## Caveats

- **The value comes from `new Date()`, not from the frame timestamp.** A frame
  timestamp is "when the frame was scheduled", which drifts from the wall clock
  and is relative to the page's start rather than to anything absolute. The
  `Date` you get is the clock's.
- **A new instance every frame.** `now` is replaced, never mutated, so a template
  re-renders on every frame and any memo keyed on `now` misses every time. If you
  want a value that only changes when the clock does, use
  [`useTimestamp`](../useTimestamp/README.md).
- **Read `isActive` off the returned object.** `const { isActive } = useNow()`
  copies the boolean once and it will never update — the same limit VueUse's
  `WritableComputedRef` has.
- **Pausing holds the value; it does not catch up.** `resume()` picks up from the
  current clock. Nothing counts missed frames, because nothing needs to.
- **The loop is dropped on unmount.**
- **No `requestAnimationFrame`, no loop.** On the server, and in any environment
  without rAF, the value is the render-time clock and `isActive` stays `false`.
  `pause` and `resume` remain callable no-ops.

## Differences from VueUse

**VueUse takes `controls` and `scheduler`; neither exists here.**

- `controls: false` (the default) returned a bare ref and `controls: true`
  returned `{ now, ...Pausable }` — two different return shapes for the same
  function, which is the same thing `useElementVisibility` was simplified away
  from. The controls are always returned.
- `scheduler` let you swap `useRafFn` for `useIntervalFn` or `useTimeoutFn`. No
  shipped util in this package accepts a scheduler, and the frame loop here is
  `useRafFn` directly. To drive a clock from a timer, use
  [`useIntervalFn`](../useIntervalFn/README.md) and own the state yourself.

So `useNow()` takes no options at all.
