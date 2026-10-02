# `watchTriggerable`

Runs a callback when a reactive source changes, and lets you invoke it manually.
Inspired by [VueUse `watchTriggerable`](https://vueuse.org/shared/watchTriggerable/).

Builds on [`watchIgnorable`](../watchIgnorable/README.md), so it also inherits the
silence controls.

## Signature

```ts
import { watchTriggerable } from '@wynn-dev/svelte-use';

const { trigger, stop } = watchTriggerable(() => settings, apply, {
	immediate: true
});

trigger(); // apply the current settings now
```

## Parameters

| Parameter | Type                             | Default | Description                                                 |
| --------- | -------------------------------- | ------- | ----------------------------------------------------------- |
| `source`  | `MaybeGetter<T>`                 | -       | Reactive source. Pass a getter to observe later changes.    |
| `cb`      | `WatchTriggerableCallback<T, R>` | -       | Called on each change or `trigger()`. Its return flows out. |
| `options` | `WatchTriggerableOptions`        | `{}`    | See below.                                                  |

| Option      | Type      | Default | Description                                            |
| ----------- | --------- | ------- | ------------------------------------------------------ |
| `immediate` | `boolean` | `false` | Call once on mount with `oldValue` set to `undefined`. |

## Returns

| Field                    | Type                    | Description                                                      |
| ------------------------ | ----------------------- | ---------------------------------------------------------------- |
| `trigger`                | `() => R`               | Run the callback now with the current value; returns its result. |
| `ignoreUpdates`          | `<R>(fn: () => R) => R` | Run `fn` without firing the callback for the change it produces. |
| `ignorePrevAsyncUpdates` | `() => void`            | Drop the next source change.                                     |
| `stop`                   | `() => void`            | Stop watching permanently and run the pending cleanup.           |

## Notes

- The previous `onCleanup` runs before every callback, including a manual `trigger()`.
- A `trigger()` does not schedule a duplicate callback on the next flush.

## Examples

### Apply on change and on demand

```svelte
<script lang="ts">
	import { watchTriggerable } from '@wynn-dev/svelte-use';

	let settings = $state({ theme: 'dark' });
	const { trigger } = watchTriggerable(
		() => settings,
		(value) => {
			document.documentElement.dataset.theme = value.theme;
		}
	);

	// run once on mount
	trigger();
</script>
```

## SSR

Safe to construct on the server: the callback never runs from `$effect`, but
`trigger()` still executes synchronously and returns its result.
