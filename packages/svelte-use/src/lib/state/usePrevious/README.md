# `usePrevious`

Tracks the previous value of a reactive source. Inspired by [VueUse `usePrevious`](https://vueuse.org/shared/usePrevious/).

## Signature

```ts
import { usePrevious } from '@wynn-dev/svelte-use';

const previousCount = usePrevious(() => count);
```

## Parameters

| Parameter      | Type             | Default     | Description                                                  |
| -------------- | ---------------- | ----------- | ------------------------------------------------------------ |
| `source`       | `MaybeGetter<T>` | —           | Reactive source. **Pass a getter** to observe later changes. |
| `initialValue` | `T`              | `undefined` | Value returned before the first change.                      |

A plain value source is read once and never changes; only a getter (or a
`$state` read) tracks updates.

## Returns

| Field    | Type                   | Description                                                 |
| -------- | ---------------------- | ----------------------------------------------------------- |
| _(call)_ | `() => T \| undefined` | Returns the value the source held before the latest change. |

The first effect run is skipped, so the initial read returns `initialValue`
rather than the current value. Comparison uses `Object.is`.

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { usePrevious } from '@wynn-dev/svelte-use';

	let count = $state(0);
	const previousCount = usePrevious(() => count);
</script>

<button onclick={() => count++}>{count}</button>

{#if previousCount() !== undefined}
	<p>Previous: {previousCount()}</p>
{/if}
```

### Logging changes

```svelte
<script lang="ts">
	import { usePrevious } from '@wynn-dev/svelte-use';

	let query = $state('');
	const previousQuery = usePrevious(() => query, '(empty)');

	$effect(() => {
		if (previousQuery() !== query) {
			console.log(`${previousQuery()} -> ${query}`);
		}
	});
</script>
```

### Default initial value

```ts
// `previous()` is `undefined` until the first change.
const previous = usePrevious(() => value);
```

## SSR

Safe to construct on the server: there is no browser API, and `$effect` is inert
there. The getter returns `initialValue` until a client-side change occurs.
