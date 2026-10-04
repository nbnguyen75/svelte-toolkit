# `useCloned`

Clone a source into independently editable state and track whether it was
modified. Inspired by [VueUse `useCloned`](https://vueuse.org/shared/useCloned/).

## Signature

```ts
import { useCloned } from '@wynn-dev/svelte-use';

const form = useCloned(() => original);
```

## Parameters

| Parameter | Type                  | Default | Description                                               |
| --------- | --------------------- | ------- | --------------------------------------------------------- |
| `source`  | `MaybeGetter<T>`      | —       | Reactive source: a value or a getter over reactive state. |
| `options` | `UseClonedOptions<T>` | `{}`    | See below.                                                |

| Option   | Type                               | Default                               | Description                                    |
| -------- | ---------------------------------- | ------------------------------------- | ---------------------------------------------- |
| `clone`  | `(source: T) => ClonedSnapshot<T>` | `$state.snapshot` + `structuredClone` | Custom clone implementation.                   |
| `manual` | `boolean`                          | `false`                               | Only sync via `sync()`; ignore source changes. |

## Returns

| Field        | Type                | Description                                                      |
| ------------ | ------------------- | ---------------------------------------------------------------- |
| `value`      | `ClonedSnapshot<T>` | Editable clone. Getter/setter-backed (destructure-safe).         |
| `isModified` | `boolean`           | Whether the clone was edited since the last sync. Getter-backed. |
| `sync`       | `() => void`        | Re-clone from the source and clear `isModified`.                 |

## Notes

The source must be **structured-cloneable**. The default clone runs
`structuredClone` over `$state.snapshot(source)`: the snapshot is required
because `structuredClone` cannot read a reactive proxy.

`value` is typed as `ClonedSnapshot<T>`, which is exactly `T` — so
`form.value.name` types exactly as you expect.

Source changes re-sync automatically unless `manual: true`.

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useCloned } from '@wynn-dev/svelte-use';

	let original = $state({ name: 'Ada', role: 'engineer' });
	const form = useCloned(() => original);
</script>

<input bind:value={form.value.name} />

{#if form.isModified}
	<p>Edited</p>
	<button onclick={() => form.sync()}>Discard</button>
{/if}
```

### Manual sync

```svelte
<script lang="ts">
	import { useCloned } from '@wynn-dev/svelte-use';

	let original = $state({ count: 0 });
	// Source changes are ignored until `sync()` is called.
	const draft = useCloned(() => original, { manual: true });

	function reload() {
		original = fetch();
		draft.sync();
	}
</script>
```

### Custom clone

```svelte
<script lang="ts">
	import { useCloned } from '@wynn-dev/svelte-use';

	// Shallow clone instead of a deep one.
	const draft = useCloned(() => original, { clone: (source) => ({ ...source }) });
</script>
```

## SSR

Safe to construct on the server: no browser API, and `$effect` is inert there, so
the clone is created once and `isModified` stays `false`.
