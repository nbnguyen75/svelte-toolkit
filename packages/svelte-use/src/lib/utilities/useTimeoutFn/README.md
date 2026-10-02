# `useTimeoutFn`

One-shot timer with `start` / `stop` controls that disarms itself on unmount.
Inspired by [VueUse `useTimeoutFn`](https://vueuse.org/shared/useTimeoutFn/).

## Signature

```ts
import { useTimeoutFn } from '@wynn-dev/svelte-use';

const { start, stop, isPending } = useTimeoutFn(() => save(), 500, { immediate: false });
```

## Parameters

| Parameter  | Type                  | Default    | Description                                                         |
| ---------- | --------------------- | ---------- | ------------------------------------------------------------------- |
| `cb`       | `(...args) => void`   | (required) | Invoked once per arming. Arguments passed to `start` are forwarded. |
| `interval` | `MaybeGetter<number>` | `0`        | Delay in ms. A getter is re-resolved on every `start`.              |
| `options`  | `UseTimeoutFnOptions` | `{}`       | See below.                                                          |

| Option              | Type      | Default | Description                                     |
| ------------------- | --------- | ------- | ----------------------------------------------- |
| `immediate`         | `boolean` | `true`  | Arm the timer on mount.                         |
| `immediateCallback` | `boolean` | `false` | Also invoke `cb` synchronously on each `start`. |

## Returns

| Field       | Type                | Description                                                   |
| ----------- | ------------------- | ------------------------------------------------------------- |
| `isPending` | `boolean`           | Whether a timeout is armed. Getter-backed (reads live state). |
| `start`     | `(...args) => void` | Arm or re-arm; a running timer is cleared first.              |
| `stop`      | `() => void`        | Disarm. Safe to call when idle.                               |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useTimeoutFn } from '@wynn-dev/svelte-use';

	let status = $state<'idle' | 'saving'>('idle');

	const save = useTimeoutFn(
		() => {
			status = 'saving';
		},
		1000,
		{ immediate: false }
	);
</script>

<button onclick={() => save.start()}>Save</button>
<button onclick={() => save.stop()}>Cancel</button>
{#if save.isPending} — <span>pending…</span>{/if}
```

### Forwarding arguments

Arguments given to `start` reach the callback; a restart drops the previous
timer and its arguments entirely (last call wins).

```ts
const { start } = useTimeoutFn((id: string) => prefetch(id), 300, { immediate: false });

start('post-1'); // cancelled by the next call
start('post-2'); // prefetch('post-2') after 300ms
```

## SSR behavior

`$effect` never runs during SSR, so `immediate: true` does not arm on the
server and `isPending` stays `false`. No timers leak into the server render.
On the client, the effect arms the timer after mount.

## Edge cases & cleanup

- The pending timer is cleared on unmount, so a callback cannot fire after teardown.
- `start` re-arms: the previous timer is cleared first, so the last call wins.
- `immediateCallback` fires with **no** arguments, matching VueUse; only the
  delayed invocation receives `start`'s arguments.
- `stop` is idempotent.
- Return a bare `void` — this is not a promise and cannot be awaited. Track a
  result separately if you need one.

## Parity notes

- VueUse calls `start()` from setup guarded by an `isClient` check. This port
  arms inside `$effect`, which is the Svelte equivalent: it runs only on the
  client, and it re-runs the cleanup on teardown, so no `tryOnScopeDispose`
  shim is needed.
- VueUse types the callback as `AnyFn` (`(...args: any[]) => any`) purely so
  its no-argument immediate edge typechecks. This port erases the arguments to
  `never[]` for that one call instead, so there is no `any` in the public types
  and the delayed edge still forwards real arguments.
