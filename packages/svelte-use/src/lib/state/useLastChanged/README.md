# `useLastChanged`

Records when a reactive source last changed. Inspired by [VueUse `useLastChanged`](https://vueuse.org/shared/useLastChanged/).

## Signature

```ts
import { useLastChanged } from '@wynn-dev/svelte-use';

const last = useLastChanged(() => count, { timestamp: () => performance.now() });
```

## Parameters

| Parameter | Type                    | Default | Description                                                  |
| --------- | ----------------------- | ------- | ------------------------------------------------------------ |
| `source`  | `MaybeGetter<T>`        | —       | Reactive source. **Pass a getter** to observe later changes. |
| `options` | `UseLastChangedOptions` | `{}`    | See below.                                                   |

| Option      | Type           | Default    | Description                                         |
| ----------- | -------------- | ---------- | --------------------------------------------------- |
| `immediate` | `boolean`      | `false`    | Stamp on the first run as well as on later changes. |
| `timestamp` | `() => number` | `Date.now` | Clock source. Inject one for deterministic tests.   |

## Returns

| Field        | Type      | Description                                               |
| ------------ | --------- | --------------------------------------------------------- |
| `timestamp`  | `number`  | Time of the last change, or `0` when there has been none. |
| `hasChanged` | `boolean` | Whether the source has changed at least once.             |

Both fields are getter-backed and read live state.

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useLastChanged } from '@wynn-dev/svelte-use';

	let count = $state(0);
	const last = useLastChanged(() => count);
</script>

<button onclick={() => count++}>{count}</button>

{#if last.hasChanged}
	<p>Last changed at {new Date(last.timestamp).toLocaleTimeString()}</p>
{/if}
```

### Stamping on the first run too

```svelte
<script lang="ts">
	import { useLastChanged } from '@wynn-dev/svelte-use';

	let list = $state(['a']);
	const mounted = useLastChanged(() => list, { immediate: true });
</script>

<p>Mounted at {new Date(mounted.timestamp).toLocaleTimeString()}</p>
```

### Deterministic timestamps in tests

```ts
let stamp = 0;
const last = useLastChanged(() => box.value, { timestamp: () => ++stamp });
```

## SSR

Safe to construct on the server: there is no browser API, and `$effect` is inert
there, so nothing is stamped — `hasChanged` stays `false` and `timestamp` stays
`0` even with `immediate: true`.
