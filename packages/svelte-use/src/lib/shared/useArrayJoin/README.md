# `useArrayJoin`

Reactive `Array.join`. Ported from [VueUse `useArrayJoin`](https://vueuse.org/shared/useArrayJoin/).

## Signature

```ts
import { useArrayJoin } from '@wynn-dev/svelte-use';

const label = useArrayJoin(['a', 'b'], ' - ');
label.value; // 'a - b'
```

## Options

| Parameter   | Type                              | Default    | Description                                       |
| ----------- | --------------------------------- | ---------- | ------------------------------------------------- |
| `list`      | `MaybeGetter<readonly unknown[]>` | (required) | Array, or a getter over reactive state.           |
| `separator` | `MaybeGetter<string>`             | `','`      | Pair separator; omitted means `','`, like native. |

## Returns

| Field   | Type     | Reactive | Description                       |
| ------- | -------- | -------- | --------------------------------- |
| `value` | `string` | getter   | Joined string (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayJoin } from '@wynn-dev/svelte-use';

	let tags = $state(['vue', 'svelte']);
	const label = useArrayJoin(() => tags, ', ');
</script>

<p>Tags: {label.value}</p>
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the join runs on read, not at construction.
- An empty list joins to `''`; `null` and `undefined` become empty segments,
  matching native `join`.
- A getter separator re-resolves on every evaluation.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` and `separator` accept a plain value or a getter, matching this
  package's `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayJoin/index.ts`.
