# `useMutationObserver`

Watch for changes being made to the DOM tree.

> Ported from [`vueuse/core/useMutationObserver`](https://github.com/vueuse/vueuse/tree/main/packages/core/useMutationObserver).

## Signature

```ts
import { useMutationObserver } from '@wynn-dev/svelte-use';

const { isSupported, stop, takeRecords } = useMutationObserver(
	target,
	(records, observer) => {
		console.log(records.length, 'changes');
	},
	{ childList: true, subtree: true }
);
```

Call it during component initialization — it uses `$effect`.

## Parameters

| Parameter  | Type                         | Description                                               |
| ---------- | ---------------------------- | --------------------------------------------------------- |
| `target`   | `MaybeElements`              | Element, array of elements, or a getter returning either. |
| `callback` | `MutationCallback`           | The platform callback, verbatim.                          |
| `options`  | `UseMutationObserverOptions` | Native `MutationObserverInit`. Defaults to `{}`.          |

`target` may be a getter so observation follows a `bind:this` that resolves later
or a reactive list that changes. Nullish targets observe nothing; repeated
elements collapse to one observation.

## Returns

| Field         | Type                                  | Reactivity                                                     |
| ------------- | ------------------------------------- | -------------------------------------------------------------- |
| `isSupported` | `boolean`                             | Plain value; `false` during SSR or without `MutationObserver`. |
| `stop`        | `() => void`                          | Disconnects and stops re-observing on a target change.         |
| `takeRecords` | `() => MutationRecord[] \| undefined` | Reads queued records without waiting for delivery.             |

## Examples

### React to list changes

```svelte
<script lang="ts">
	import { useMutationObserver } from '@wynn-dev/svelte-use';

	let list = $state<HTMLUListElement | undefined>();
	let added = $state(0);

	useMutationObserver(
		() => list,
		(records) => {
			added += records.filter((record) => record.type === 'childList').length;
		},
		{ childList: true, subtree: true }
	);
</script>

<ul bind:this={list}>
	{#each Array(added) as _, i (i)}
		<li>row {i + 1}</li>
	{/each}
</ul>

<button onclick={() => list?.append(document.createElement('li'))}>append</button>
```

### Watch an attribute

```svelte
<script lang="ts">
	import { useMutationObserver } from '@wynn-dev/svelte-use';

	let markup = $state('');
	let node = $state<HTMLDivElement | undefined>();

	useMutationObserver(
		node,
		() => {
			markup = node?.innerHTML ?? '';
		},
		{ childList: true }
	);
</script>

<div bind:this={node}>{markup}</div>
```

### Stop observing early

```ts
const { stop } = useMutationObserver(
	() => node,
	(records) => {
		if (records.length > 50) stop();
	},
	{ childList: true }
);
```

## Edge cases & cleanup

- The observer is created per `$effect` run and disconnected when that run is
  replaced, so a swapped target never leaves the old one watched.
- `stop()` is idempotent and also prevents re-observation if the target changes
  afterwards.
- The callback is the platform's: it fires once per batched delivery as a
  microtask, not once per mutation. Use `takeRecords()` to drain synchronously.
- No timers or listeners.

## Parity notes

- **`effect` instead of `watch`.** VueUse watches a computed list of targets with
  `flush: 'post'`. Here a single `$effect` reads the getter, which gives the same
  re-observe-on-change behaviour without the extra computed layer.
- **Options pass straight through.** VueUse declares `UseMutationObserverOptions`
  as `MutationObserverInit & ConfigurableWindow` and spreads the remainder. This
  package has no `window` option to configure, so the alias is the platform type
  itself and every option keeps its native meaning.
- **`isSupported` is a plain boolean.** VueUse's `useSupported` is a ref; the
  package has no `usePausable` / `useSupported` primitive to build on yet, and the
  answer cannot change within a page, so there is nothing to make reactive.
- **SSR-safe by construction.** `$effect` never runs on the server, so no
  observer is constructed and `isSupported` reports `false`.
