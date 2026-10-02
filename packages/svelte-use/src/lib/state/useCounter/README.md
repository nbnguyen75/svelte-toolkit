# `useCounter`

Basic counter with `inc` / `dec` / `set` / `reset` and optional bounds. Inspired by [VueUse `useCounter`](https://vueuse.org/shared/useCounter/).

## Signature

```ts
import { useCounter } from '@wynn-dev/svelte-use';

const { count, inc, dec } = useCounter(0, { min: 0, max: 10 });
```

## Parameters

| Parameter      | Type                  | Default | Description                                       |
| -------------- | --------------------- | ------- | ------------------------------------------------- |
| `initialValue` | `MaybeGetter<number>` | `0`     | Starting value. **Not clamped** (matches VueUse). |
| `options`      | `UseCounterOptions`   | `{}`    | See below.                                        |

| Option | Type     | Default     | Description                |
| ------ | -------- | ----------- | -------------------------- |
| `max`  | `number` | `Infinity`  | Upper bound for the count. |
| `min`  | `number` | `-Infinity` | Lower bound for the count. |

Bounds are applied by `inc`, `dec`, `set`, and `reset` — but **not** to
`initialValue`.

## Returns

| Field   | Type                       | Description                                           |
| ------- | -------------------------- | ----------------------------------------------------- |
| `count` | `number`                   | Current count. Getter-backed (reads live state).      |
| `get`   | `() => number`             | Read the current count.                               |
| `inc`   | `(delta?: number) => void` | Add `delta` (default `1`), clamped.                   |
| `dec`   | `(delta?: number) => void` | Subtract `delta` (default `1`), clamped.              |
| `set`   | `(value: number) => void`  | Set the count, clamped.                               |
| `reset` | `(value?: number) => void` | Reset to the initial value, or to `value` when given. |

`reset(value)` also **redefines** what a later bare `reset()` restores, so it
doubles as "make this the new baseline".

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useCounter } from '@wynn-dev/svelte-use';

	const counter = useCounter(0, { min: 0 });
</script>

<button onclick={() => counter.dec()}>-</button>
<span>{counter.count}</span>
<button onclick={() => counter.inc()}>+</button>
<button onclick={() => counter.reset()}>reset</button>
```

### Bounded counter

```svelte
<script lang="ts">
	import { useCounter } from '@wynn-dev/svelte-use';

	const volume = useCounter(5, { min: 0, max: 10 });
</script>

<input
	type="range"
	min="0"
	max="10"
	value={volume.count}
	oninput={(event) => volume.set(Number(event.currentTarget.value))}
/>
```

### Jumping to a new baseline

```svelte
<script lang="ts">
	import { useCounter } from '@wynn-dev/svelte-use';

	const basket = useCounter(0);
	basket.inc(3);
	basket.reset(10); // now 10, and bare reset() stays at 10
</script>
```

## SSR

Safe to construct on the server: no browser API and no `$effect`. All mutators
work identically.
