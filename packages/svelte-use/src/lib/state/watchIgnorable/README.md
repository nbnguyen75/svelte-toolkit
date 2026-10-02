# `watchIgnorable`

Runs a callback when a reactive source changes, with controls to suppress
individual updates. Inspired by [VueUse `watchIgnorable`](https://vueuse.org/shared/watchIgnorable/).

Svelte has no `watch` primitive, so this wraps `$effect`. The callback receives
the new value, the previous value, and an `onCleanup` registrar.

## Signature

```ts
import { watchIgnorable } from '@wynn-dev/svelte-use';

const watch = watchIgnorable(
	() => count,
	(value, oldValue) => {
		console.log(oldValue, '->', value);
	}
);

watch.ignoreUpdates(() => {
	count += 1; // does not call the callback
});
watch.stop();
```

## Parameters

| Parameter | Type                                   | Default | Description                                                 |
| --------- | -------------------------------------- | ------- | ----------------------------------------------------------- |
| `source`  | `MaybeGetter<T>`                       | -       | Reactive source. Pass a getter to observe later changes.    |
| `cb`      | `(value, oldValue, onCleanup) => void` | -       | Called on each change. `onCleanup` registers teardown work. |
| `options` | `WatchIgnorableOptions`                | `{}`    | See below.                                                  |

| Option      | Type      | Default | Description                                            |
| ----------- | --------- | ------- | ------------------------------------------------------ |
| `immediate` | `boolean` | `false` | Call once on mount with `oldValue` set to `undefined`. |

## Returns

| Field                    | Type                    | Description                                                      |
| ------------------------ | ----------------------- | ---------------------------------------------------------------- |
| `ignoreUpdates`          | `<R>(fn: () => R) => R` | Run `fn` without firing the callback for the change it produces. |
| `ignorePrevAsyncUpdates` | `() => void`            | Drop the next source change.                                     |
| `stop`                   | `() => void`            | Stop watching permanently and run the pending cleanup.           |

## Notes

- Changes are batched by Svelte, so `onCleanup` runs before the next callback,
  on `stop()`, and when the owning component unmounts.
- A write that leaves the value unchanged (per `Object.is`) does not fire.

## Examples

### Saving without tracking the save

```svelte
<script lang="ts">
	import { watchIgnorable } from '@wynn-dev/svelte-use';

	let count = $state(0);
	const watch = watchIgnorable(
		() => count,
		(value) => save(value)
	);

	function restore(value: number) {
		watch.ignoreUpdates(() => {
			count = value;
		});
	}
</script>
```

## SSR

Safe to construct on the server: `$effect` is inert there, so the callback never
runs. `ignoreUpdates` still executes its updater synchronously and returns its
result.
