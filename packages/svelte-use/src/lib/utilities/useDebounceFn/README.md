# `useDebounceFn`

Debounce helper with lodash-style `leading` / `trailing` / `maxWait`
semantics, vendored with zero dependencies.
Inspired by [VueUse `useDebounceFn`](https://vueuse.org/shared/useDebounceFn/).

## Signature

```ts
import { useDebounceFn } from '@wynn-dev/svelte-use';

const onInput = useDebounceFn((query: string) => search(query), 200);
const save = useDebounceFn(persist, 1000, { maxWait: 5000 });
```

## Options

| Parameter  | Type                | Default    | Description                                                                            |
| ---------- | ------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `fn`       | `(...args) => void` | (required) | Function to debounce.                                                                  |
| `delay`    | `number`            | `200`      | Quiet period in ms; `<= 0` invokes synchronously.                                      |
| `leading`  | `boolean`           | `false`    | Invoke on the leading edge of a burst.                                                 |
| `trailing` | `boolean`           | `true`     | Invoke on the trailing edge after `delay` ms of quiet.                                 |
| `maxWait`  | `number`            | —          | Force an invocation at most this long after burst start; `<= 0` invokes synchronously. |

## Returns

| Field     | Type                | Description                                              |
| --------- | ------------------- | -------------------------------------------------------- |
| (call)    | `(...args) => void` | Debounced invocation; latest args win.                   |
| `cancel`  | `() => void`        | Drop pending invocation; safe repeated / when idle.      |
| `flush`   | `() => void`        | Invoke now with latest args if pending; no-op when idle. |
| `pending` | `() => boolean`     | Whether a timer is armed.                                |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useDebounceFn, useEventListener } from '@wynn-dev/svelte-use';

	let query = $state('');

	const search = useDebounceFn((value: string) => fetchResults(value), 250);
	useEventListener(
		() => document.getElementById('search'),
		'input',
		(e) => (query = (e.target as HTMLInputElement).value)
	);
</script>

<input id="search" bind:value={query} oninput={() => search(query)} />
```

### SSR behavior

Pure logic, no DOM access — safe to create and call during SSR. Pending
timers simply never fire on the server; call `cancel()`/`flush()` if a
server context is discarded.

## Edge cases & cleanup

- Sustained bursts invoke at most every `maxWait` (latest args), plus a
  final trailing call after quiet — unless `trailing: false`.
- `leading: true` invokes the first call immediately, then debounces the
  rest; with `trailing: false` each burst invokes exactly once.
- Cancelled wrappers stay reusable; `flush()` after `cancel()` is a no-op.
- All arguments are forwarded, not just the first.
- Returned function is not reactive — it is a stable closure. It holds no
  effect scope, so **nothing disposes it for you**: call `cancel()` on
  unmount (or in an `$effect` teardown) or a pending invocation can fire
  after teardown.
- Not an event filter: the call does not return a promise and does not
  forward `this`. Use `useEventListener(el, 'click', debounced)` and
  `cancel()` in the effect's teardown for event wiring.

## Parity notes

- Extends VueUse's `debounceFilter` (which is trailing-only) with
  `leading`/`trailing` edges and a `pending()` probe mirroring its
  `isPending`. Unlike VueUse, the wrapper stays synchronous: no promise
  wrapper, no `this` forwarding, no `rejectOnCancel`.
- VueUse resolves a promise per call so a caller can await a debounced
  result. This port returns `void`; wrap the target yourself if you need
  the result (e.g. return a promise from `fn` and track it separately).
