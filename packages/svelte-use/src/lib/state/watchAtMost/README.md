# `watchAtMost`

Runs a callback for at most a given number of source changes, then stops.
Inspired by [VueUse `watchAtMost`](https://vueuse.org/shared/watchAtMost/).

Wraps Svelte's `$effect`. The callback receives the new value, the previous
value, and an `onCleanup` registrar.

## Signature

```ts
import { watchAtMost } from '@wynn-dev/svelte-use';

const watch = watchAtMost(
	() => draft,
	(value) => save(value),
	{ count: 5 }
);

watch.calls; // number of invocations so far
watch.pause();
watch.resume();
watch.stop();
```

## Parameters

| Parameter | Type                                   | Default | Description                                              |
| --------- | -------------------------------------- | ------- | -------------------------------------------------------- |
| `source`  | `MaybeGetter<T>`                       | -       | Reactive source. Pass a getter to observe later changes. |
| `cb`      | `(value, oldValue, onCleanup) => void` | -       | Called on each change.                                   |
| `options` | `WatchAtMostOptions`                   | -       | See below. `count` is required.                          |

| Option      | Type                  | Default | Description                                                 |
| ----------- | --------------------- | ------- | ----------------------------------------------------------- |
| `count`     | `MaybeGetter<number>` | -       | Maximum invocations. A getter is re-resolved on every fire. |
| `immediate` | `boolean`             | `false` | Fire on mount; counts as the first invocation.              |

## Returns

| Field    | Type         | Description                                              |
| -------- | ------------ | -------------------------------------------------------- |
| `calls`  | `number`     | Invocations so far. Getter-backed and destructure-safe.  |
| `pause`  | `() => void` | Suspend notifications. Changes while paused are dropped. |
| `resume` | `() => void` | Resume without catching up on missed changes.            |
| `stop`   | `() => void` | Stop watching permanently.                               |

## Examples

### Limit expensive work

```svelte
<script lang="ts">
	import { watchAtMost } from '@wynn-dev/svelte-use';

	let draft = $state('');
	const autosave = watchAtMost(
		() => draft,
		(value) => save(value),
		{
			count: 3
		}
	);
</script>

<p>Autosaves left: {3 - autosave.calls}</p>
```

### Reactive limit

```ts
const limit = $state(2);
watchAtMost(() => value, persist, { count: () => limit });
```

## SSR

Safe to construct on the server: `$effect` is inert, so the callback never runs
and `calls` stays `0`. `pause`, `resume` and `stop` are safe to call.
