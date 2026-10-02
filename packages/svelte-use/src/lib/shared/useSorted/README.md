# `useSorted`

Reactive sorted array — copy-on-read by default, in-place with `dirty`. Ported from [VueUse `useSorted`](https://vueuse.org/core/useSorted/).

## Signature

```ts
import { useSorted } from '@wynn-dev/svelte-use';

const ranked = useSorted([3, 1, 2]);
ranked.value; // [1, 2, 3] (source untouched)

useSorted(['b', 'a'], { compareFn: (a, b) => a.localeCompare(b) });
useSorted(source, { dirty: true }); // sorts source in place
```

## Options

The second argument is a compare function or an options object; the third is
options.

| Parameter   | Type                      | Default               | Description                                  |
| ----------- | ------------------------- | --------------------- | -------------------------------------------- |
| `source`    | `MaybeGetter<T[]>`        | (required)            | Array, or a getter over reactive state.      |
| `compareFn` | `(a, b) => number`        | numeric subtraction   | Comparison used by the default sort.         |
| `sortFn`    | `(arr, compareFn) => T[]` | `arr.sort(compareFn)` | Custom sort implementation.                  |
| `dirty`     | `boolean`                 | `false`               | Sort the source in place instead of copying. |

`dirty: true` needs component initialization, because it registers an
`$effect`.

## Returns

| Field   | Type  | Reactive | Description                                                              |
| ------- | ----- | -------- | ------------------------------------------------------------------------ |
| `value` | `T[]` | getter   | Sorted array — a copy, or the source in `dirty` mode (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useSorted } from '@wynn-dev/svelte-use';

	let scores = $state([
		{ name: 'ada', score: 30 },
		{ name: 'bob', score: 20 }
	]);
	const ranked = useSorted(
		() => scores,
		(a, b) => b.score - a.score
	);
</script>

<ol>
	{#each ranked.value as person (person.name)}
		<li>{person.name}: {person.score}</li>
	{/each}
</ol>
```

### Sorting in place

```svelte
<script lang="ts">
	import { useSorted } from '@wynn-dev/svelte-use';

	let rows = $state([3, 1, 2]);
	// `rows` itself becomes [1, 2, 3].
	useSorted(() => rows, { dirty: true });
</script>
```

### SSR behavior

Copy mode is pure derived logic with no DOM access — safe during SSR. `dirty`
mode registers an `$effect`, which never runs on the server, so the server
render shows the unsorted source and the client sorts it on hydration.

## Edge cases & cleanup

- Lazy: sorting runs on read, not at construction.
- The default comparison applies `ToNumber` coercion, so numeric strings sort
  numerically and non-numeric values yield `NaN` (an unspecified order).
- Copy mode returns a new array and never mutates the source. `dirty` mode
  splices the source in place only when the order actually changed, so the
  effect settles instead of re-triggering itself.
- `dirty` mode stops sorting once the owning component unmounts.
- No listeners or timers.

## VueUse parity notes

- `source` accepts a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/core/useSorted/index.ts`.
