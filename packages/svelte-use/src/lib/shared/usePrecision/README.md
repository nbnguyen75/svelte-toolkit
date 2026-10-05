# `usePrecision`

Reactively round a number to a fixed count of decimal places, without the
binary floating-point error. Inspired by
[VueUse `usePrecision`](https://vueuse.org/math/usePrecision/).

## Signature

```ts
import { usePrecision } from '@wynn-dev/svelte-use';

const price = usePrecision(() => rawTotal, 2, { math: 'round' });

console.log(price.value);
```

## Options

`MaybeGetter<T>` inputs accept a plain value or a `() => value` getter.

| Option    | Type                                                              | Default     | Description                                   |
| --------- | ----------------------------------------------------------------- | ----------- | --------------------------------------------- |
| `value`   | `number \| (() => number)`                                        | —           | Number to round. Read on every access.        |
| `digits`  | `number \| (() => number)`                                        | —           | Decimal places to keep. Read on every access. |
| `options` | `UsePrecisionOptions \| (() => UsePrecisionOptions \| undefined)` | `undefined` | Rounding method. Read on every access.        |

| `UsePrecisionOptions` field | Type                           | Default   | Description                     |
| --------------------------- | ------------------------------ | --------- | ------------------------------- |
| `math`                      | `'floor' \| 'ceil' \| 'round'` | `'round'` | Which `Math` rounding to apply. |

## Returns

| Field   | Type     | Reactive | Description                            |
| ------- | -------- | -------- | -------------------------------------- |
| `value` | `number` | getter   | The rounded number (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { usePrecision } from '@wynn-dev/svelte-use';

	let total = $state(45.125);
	const price = usePrecision(() => total, 2);
</script>

<span>{price.value}</span>
```

### Floor for a discount band

```svelte
<script lang="ts">
	import { usePrecision } from '@wynn-dev/svelte-use';

	let total = $state(45.129);
	// Never round the customer up.
	const band = usePrecision(() => total, 2, { math: 'floor' });
</script>

<span>{band.value}</span>
```

### SSR behavior

Pure math — the server renders exactly what the browser computes, with no
fallback and nothing guarded. `usePrecision(45.125, 2).value` is `45.13` in
both.

## Edge cases & cleanup

- **No timers, listeners, observers, or subscriptions.** The rounding is a single
  `$derived`; there is nothing to stop and nothing leaks on unmount.
- **The float error is corrected, not rounded over.** `45.125 * 100` is
  `4512.4999…` in binary floating point, so a naive
  `Math.round(value * power) / power` answers `45.12`. The value is scaled
  through the integer domain first, which is the case this util exists for.
- **Only positive values with a decimal point take that path.** Anything else —
  integers, zero, negatives — is already exact and skips it.
- **Negative `digits` are not special-cased.** `10 ** -2` is `0.01`, so the same
  formula rounds to tens and hundreds; upstream behaves identically.
- Must be called in component initialization (uses `$derived`).

## VueUse parity notes

- **`options` accepts a getter**, matching upstream's
  `MaybeRefOrGetter<UsePrecisionOptions>`. A plain object still works.
- **No `isReadonly` / writable split.** Upstream returns a writable ref only when
  handed a writable ref; Svelte has no refs, so this always returns a read-only
  getter. Write through your own `$state` instead — see the `useClamp` recipe.
- Source analyzed: `vueuse/packages/math/usePrecision/index.ts`.
