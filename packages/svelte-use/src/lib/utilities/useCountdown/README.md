# `useCountdown`

Countdown in seconds with `start` / `pause` / `resume` / `reset` / `stop`.
Inspired by [VueUse `useCountdown`](https://vueuse.org/shared/useCountdown/).

## Signature

```ts
import { useCountdown } from '@wynn-dev/svelte-use';

const { remaining, isActive, start, stop } = useCountdown(60, {
	onComplete: () => submit()
});
```

## Parameters

| Parameter          | Type                  | Default    | Description                                                   |
| ------------------ | --------------------- | ---------- | ------------------------------------------------------------- |
| `initialCountdown` | `MaybeGetter<number>` | (required) | Starting value in seconds. A getter re-resolves on `reset()`. |
| `options`          | `UseCountdownOptions` | `{}`       | See below.                                                    |

| Option       | Type                                        | Default            | Description                                |
| ------------ | ------------------------------------------- | ------------------ | ------------------------------------------ |
| `onComplete` | `() => void`                                | —                  | Called once, when the countdown reaches 0. |
| `onTick`     | `() => void`                                | —                  | Called on every tick.                      |
| `scheduler`  | `(cb: () => void) => UseCountdownScheduler` | 1s `useIntervalFn` | Tick source factory. Starts paused.        |

## Returns

| Field       | Type                   | Description                                                   |
| ----------- | ---------------------- | ------------------------------------------------------------- |
| `remaining` | `number`               | Seconds left. Getter **and** setter, so `bind:` works.        |
| `isActive`  | `boolean`              | Whether it is ticking. Getter-backed.                         |
| `start`     | `(countdown?) => void` | Reset to `countdown` (or the initial value) **and** start.    |
| `pause`     | `() => void`           | Stop ticking, keep `remaining`.                               |
| `resume`    | `() => void`           | Resume without resetting. No-op if active or already at 0.    |
| `reset`     | `(countdown?) => void` | Reset to `countdown` (or the initial value) without starting. |
| `stop`      | `() => void`           | Pause **and** reset to the initial value.                     |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useCountdown } from '@wynn-dev/svelte-use';

	const timer = useCountdown(60, {
		onComplete: () => {
			/* … */
		}
	});
</script>

<button onclick={() => timer.start()}>Start</button>
<button onclick={() => timer.pause()}>Pause</button>
<button onclick={() => timer.stop()}>Reset</button>
<p>{timer.remaining}s</p>
```

### `start` resets, `resume` does not

The distinction matters when you want to resume a partially-elapsed timer:

```ts
timer.start(30); // remaining = 30, ticking
timer.pause(); // remaining = 28
timer.resume(); // continues from 28 — does NOT reset
timer.start(); // remaining = 60 (the initial value), ticking again
```

### Injecting a scheduler

`scheduler` replaces the tick source. Useful for driving the countdown from
animation frames, or for testing without real timers:

```ts
const timer = useCountdown(10, {
	scheduler: (cb) => useRafFn(() => cb(), { fpsLimit: 4 })
});
```

## SSR behavior

`$effect` never runs during SSR, so the default scheduler stays paused and
`remaining` is simply the initial value — no server-side timer. An explicit
`start()` during a server render _does_ begin ticking; don't call it there.

## Edge cases & cleanup

- Ticking is stopped on unmount, so `onTick` / `onComplete` cannot fire after teardown.
- `remaining` clamps at 0 and never goes negative, so a late tick cannot report `-1`.
- `onComplete` fires exactly once per run — the scheduler pauses before it is called.
- `resume` is a no-op when `remaining` is 0, so a finished countdown cannot be restarted
  by a stray `resume()`; use `start()` to run it again.
- `remaining` is writable. Setting it does **not** start the countdown — call `resume()`.
- A scheduler that invokes its callback synchronously during construction would hit the
  temporal dead zone for `controls`. The default (paused `useIntervalFn`) and
  `useRafFn` both schedule rather than invoke, so this only matters for a custom scheduler.
- `bind:remaining` works on the setter.

## Parity notes

- VueUse exposes `{ remaining, isActive, pause, resume, stop }`. This port adds
  `start` and `reset` (and a writable `remaining`) because VueUse's `stop`/resume
  split makes "run it again" awkward; the timer semantics are otherwise identical.
- VueUse hard-codes a `setInterval` tick. Here it is a `scheduler` factory, which
  keeps the countdown's own logic free of real timers and lets a consumer choose
  the cadence.
