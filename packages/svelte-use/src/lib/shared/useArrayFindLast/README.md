# `useArrayFindLast`

Reactive `Array.findLast`, scanned from the end. Ported from [VueUse `useArrayFindLast`](https://vueuse.org/shared/useArrayFindLast/).

## Signature

```ts
import { useArrayFindLast } from '@wynn-dev/svelte-use';

const last = useArrayFindLast([2, 1, 4], (n) => n % 2 === 0);
last.value; // 4
```

## Options

| Parameter | Type                                 | Default    | Description                                           |
| --------- | ------------------------------------ | ---------- | ----------------------------------------------------- |
| `list`    | `MaybeGetter<readonly T[]>`          | (required) | Array, or a getter over reactive state.               |
| `fn`      | `(element, index, array) => unknown` | (required) | Predicate invoked per element, with native arguments. |

## Returns

| Field   | Type             | Reactive | Description                                    |
| ------- | ---------------- | -------- | ---------------------------------------------- |
| `value` | `T \| undefined` | getter   | Last match, or `undefined` (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayFindLast } from '@wynn-dev/svelte-use';

	let log = $state([{ ok: true }, { ok: false }, { ok: true }]);
	const lastOk = useArrayFindLast(
		() => log,
		(entry) => entry.ok
	);
</script>

<p>{lastOk.value ? 'last ok' : 'none'}</p>
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the predicate runs on read, not at construction.
- The scan runs end-to-start and stops at the first match; the reported index
  is the real array index, not a reversed one.
- No match, or an empty list, yields `undefined`.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- Uses native `Array.prototype.findLast`; the VueUse original hand-rolls the
  reverse scan, which only differs on engines without `findLast`.
- `list` accepts a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayFindLast/index.ts`.
