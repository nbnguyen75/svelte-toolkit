# `useEventSource`

Reactive Server-Sent Events client, with reconnecting. Inspired by
[VueUse `useEventSource`](https://vueuse.org/core/useEventSource/).

## Signature

```ts
import { useEventSource } from '@wynn-dev/svelte-use';

const feed = useEventSource<['price'], string>(() => streamUrl, ['price'], {
	autoReconnect: true
});

console.log(feed.data);
```

## Options

| Option            | Type                                      | Default       | Description                                                               |
| ----------------- | ----------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| `url`             | `string \| URL \| undefined \| (() => …)` | —             | Stream URL. `undefined` opens nothing. Reopens on change.                 |
| `events`          | `Events`                                  | `['message']` | Named events to listen for.                                               |
| `autoReconnect`   | `boolean \| { retries, delay, onFailed }` | `false`       | Reopen on refusal (see below).                                            |
| `immediate`       | `boolean`                                 | `true`        | Open on setup.                                                            |
| `autoConnect`     | `boolean`                                 | `true`        | Reopen when the URL changes.                                              |
| `serializer`      | `{ read: (value?: string) => Data }`      | identity      | Convert the raw string into `Data`. Required when `Data` is not a string. |
| `withCredentials` | `boolean` (via `EventSourceInit`)         | `false`       | Passed to the constructor.                                                |

`retries` is a count or a predicate returning whether to retry (default `-1`,
forever); `delay` is ms between attempts (default `1000`); `onFailed` runs
when the budget runs out.

## Returns

| Field         | Type                                 | Reactive | Description                                       |
| ------------- | ------------------------------------ | -------- | ------------------------------------------------- |
| `data`        | `Data \| null`                       | getter   | The latest payload received.                      |
| `status`      | `'CONNECTING' \| 'OPEN' \| 'CLOSED'` | getter   | Connection state.                                 |
| `event`       | `Events[number] \| null`             | getter   | The latest named event.                           |
| `error`       | `Event \| null`                      | getter   | The latest error event.                           |
| `close`       | `() => void`                         | —        | Close gracefully. Further errors never reconnect. |
| `open`        | `() => void`                         | —        | Reopen, closing the current stream first.         |
| `eventSource` | `EventSource \| null`                | getter   | The live instance.                                |
| `lastEventId` | `string \| null`                     | getter   | The latest server-sent `lastEventId`.             |

## Examples

### Live feed with reconnect

```svelte
<script lang="ts">
	import { useEventSource } from '@wynn-dev/svelte-use';

	const feed = useEventSource<['price'], string>(() => '/api/prices', ['price'], {
		autoReconnect: { retries: 5, delay: 2000 }
	});
</script>

<p>{feed.status}: {feed.data}</p>
<button onclick={() => feed.open()}>Reconnect</button>
```

### Parsed payloads

```svelte
<script lang="ts">
	import { useEventSource } from '@wynn-dev/svelte-use';

	interface Tick {
		symbol: string;
		price: number;
	}
	const feed = useEventSource<['tick'], Tick>(() => '/api/ticks', ['tick'], {
		serializer: { read: (value) => JSON.parse(value ?? 'null') }
	});
</script>

<p>{feed.data?.symbol}: {feed.data?.price}</p>
```

### SSR behavior

Nothing opens on the server: `status` reads `CONNECTING`, everything else its
empty default, and `open`/`close` are safe no-ops. The stream connects on
hydration.

## Edge cases & cleanup

- **Reconnect fires only on refusal.** A dropped connection that `EventSource`
  itself retries (`readyState` still open/connecting) never reaches the retry
  logic — only a refused one (`readyState` closed) does. This is upstream's
  subtle core and is pinned by tests.
- **`retries` counts attempts.** `retries: 2` reconnects once and calls
  `onFailed` on the second failure — matching upstream's `retried < retries`
  check, not fixing its off-by-one.
- **The status starts `CONNECTING`, even with `immediate: false`.**
  Verbatim upstream: nothing has been opened, but the initial state says
  otherwise. Pinned by a test, not fixed.
- **URL tracking compares by identity.** Pass a stable value — a fresh `new
URL()` per render never matches and reconnects forever, same as upstream's
  watcher.
- **Explicit close wins.** After `close()`, further errors never reconnect;
  `open()` resets the retry counter.
- **Unmount drops everything**: the retry timer, the named listeners, and the
  connection.
- Must be called in component initialization (uses `$state` / `$effect`).

## VueUse parity notes

- **Named listeners bind per connection via `addEventListener`.** Upstream
  assigns `onopen`/`onerror` props and binds named events through its listener
  util; here all three go through the internal `bindListener`, so reconnecting
  never accumulates a listener per generation (the old instance is detached
  with its listeners).
- **One documented `any`-boundary.** The default serializer is `(v) => v as
Data`, exactly like upstream; sound when `Data` accepts strings (the
  default `Data = string`), otherwise pass a real serializer. Same rationale
  as `useCloned`'s one cast.
- **The events default is one assertion.** Upstream writes `as unknown as
Events` twice; here `['message']` is asserted once, in one place.
- Source analyzed: `vueuse/packages/core/useEventSource/index.ts`.
