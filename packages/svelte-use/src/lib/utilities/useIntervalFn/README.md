# `useIntervalFn`

Repeating timer with `resume` / `pause` controls that clears itself on unmount.
Inspired by [VueUse `useIntervalFn`](https://vueuse.org/shared/useIntervalFn/).

## Signature

```ts
import { useIntervalFn } from '@wynn-dev/svelte-use';

const { resume, pause, isActive } = useIntervalFn(() => tick(), 1000);
```

## Parameters

| Parameter  | Type                   | Default    | Description                                           |
| ---------- | ---------------------- | ---------- | ----------------------------------------------------- |
| `cb`       | `() => void`           | (required) | Invoked every period.                                 |
| `interval` | `MaybeGetter<number>`  | `1000`     | Period in ms. `<= 0` is ignored. A getter is tracked. |
| `options`  | `UseIntervalFnOptions` | `{}`       | See below.                                            |

| Option              | Type      | Default | Description                                      |
| ------------------- | --------- | ------- | ------------------------------------------------ |
| `immediate`         | `boolean` | `true`  | Start on mount.                                  |
| `immediateCallback` | `boolean` | `false` | Also invoke `cb` synchronously on each `resume`. |

## Returns

| Field      | Type         | Description                                              |
| ---------- | ------------ | -------------------------------------------------------- |
| `isActive` | `boolean`    | Whether the interval is running. Getter-backed.          |
| `pause`    | `() => void` | Stop. Safe when idle, and safe from inside the callback. |
| `resume`   | `() => void` | Start or restart. Non-positive periods are ignored.      |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useIntervalFn } from '@wynn-dev/svelte-use';

	let seconds = $state(0);
	const clock = useIntervalFn(() => seconds++, 1000);
</script>

<button onclick={() => clock.pause()}>Pause</button>
<button onclick={() => clock.resume()}>Resume</button>
<p>Elapsed: {seconds}s</p>
```

### Reactive period

```ts
let speed = $state(1);
const poll = useIntervalFn(
	() => refetch(),
	() => 1000 / speed.value
);
speed = 4; // restarts at 250ms while active; ignored while paused
```

## SSR behavior

`$effect` never runs during SSR, so `immediate: true` does not start a server-side
interval and `isActive` stays `false`. An explicit `resume()` during SSR _does_
arm a real timer — that is the caller's explicit choice, so don't call it during a
server render.

## Edge cases & cleanup

- The interval is cleared on unmount, so the callback cannot fire after teardown.
- `resume` clears the previous interval first: the last call wins.
- Changing a getter `interval` while active restarts at the new cadence. While
  paused, nothing restarts — `resume` is gated on the active state.
- `pause` called from inside the callback stops the next tick (VueUse parity):
  `immediateCallback` is re-checked after the synchronous call for the same reason.
- `interval <= 0` is ignored and leaves the interval inactive, so a bad value can
  never spin the event loop.
- `resume` and `pause` are idempotent.

## Parity notes

- VueUse watches the interval with `watch` and guards the auto-start on
  `isClient`. This port tracks the getter through a second `$effect`, which also
  needs no `tryOnScopeDispose` shim — the lifecycle effect owns cleanup. The
  tracking effect deliberately carries no cleanup of its own, so unmount can never
  be misread as a "stop" request.
- `isActive` is a getter-backed `boolean`, mirroring VueUse's `shallowReadonly`
  ref: read `api.isActive` to see the live value.
