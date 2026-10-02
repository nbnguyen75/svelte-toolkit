# `until`

Promised one-time watches: resolve a `Promise` when a reactive source meets a
condition. Inspired by [VueUse `until`](https://vueuse.org/shared/until/).

`until` constructs a `$effect`, so call it during component initialization (or
inside `$effect.root`).

## Signature

```ts
import { until } from '@wynn-dev/svelte-use';

await until(() => status).toBe('ready');
await until(() => list).toContains('done');
await until(() => count).changedTimes(3);
```

## Matchers

Available on every instance:

| Matcher                     | Resolves with                            |
| --------------------------- | ---------------------------------------- |
| `toMatch(fn, options?)`     | First value satisfying the predicate.    |
| `changed(options?)`         | The value after the next change.         |
| `changedTimes(n, options?)` | The value after `n` changes.             |
| `not`                       | An instance with the condition inverted. |

Value sources additionally expose `toBe(value)`, `toBeTruthy()`, `toBeNull()`,
`toBeUndefined()` and `toBeNaN()`. Array sources expose `toContains(value)`.

## Options

| Option           | Type      | Default | Description                                                               |
| ---------------- | --------- | ------- | ------------------------------------------------------------------------- |
| `timeout`        | `number`  | `0`     | Milliseconds before settling with the current value. `0` never times out. |
| `throwOnTimeout` | `boolean` | `false` | Reject on timeout instead of resolving.                                   |

## Notes

- `toBe` accepts a getter target and tracks it, so changing the target can
  resolve the promise.
- An already-matching condition resolves synchronously; otherwise the promise
  settles on the next source change.

## Examples

### Wait for readiness

```svelte
<script lang="ts">
	import { until } from '@wynn-dev/svelte-use';

	let status = $state('loading');

	async function init() {
		await until(() => status).toBe('ready');
		startHeavyWork();
	}
</script>
```

### Wait for an item to appear

```ts
await until(() => items).toContains({ id });
```

## SSR

Safe to construct on the server: `$effect` is inert, so an already-matching
matcher still resolves (the immediate check runs synchronously), while a matcher
that must wait for a change cannot settle there.
