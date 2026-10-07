# `useBroadcastChannel`

Reactive `BroadcastChannel`: same-origin tabs on the same channel name hear
each other's posts. Inspired by
[VueUse `useBroadcastChannel`](https://vueuse.org/core/useBroadcastChannel/).

## Signature

```ts
import { useBroadcastChannel } from '@wynn-dev/svelte-use';

const bus = useBroadcastChannel<string, string>({ name: 'theme' });
bus.post('dark');

console.log(bus.data);
```

## Options

| Option | Type     | Default | Description                                            |
| ------ | -------- | ------- | ------------------------------------------------------ |
| `name` | `string` | —       | Channel name. Tabs with the same name hear each other. |

## Returns

| Field         | Type                            | Reactive | Description                                        |
| ------------- | ------------------------------- | -------- | -------------------------------------------------- |
| `isSupported` | `boolean`                       | —        | Whether `BroadcastChannel` exists. `false` in SSR. |
| `channel`     | `BroadcastChannel \| undefined` | getter   | The live channel, once opened.                     |
| `data`        | `D \| undefined`                | getter   | The latest payload received.                       |
| `post`        | `(data: P) => void`             | —        | Post to every other listener. No-op before open.   |
| `close`       | `() => void`                    | —        | Close the channel. Idempotent.                     |
| `error`       | `Event \| null`                 | getter   | The latest `messageerror` event.                   |
| `isClosed`    | `boolean`                       | getter   | Whether the channel has been closed.               |

`D` is the received payload type, `P` the posted one — usually the same.

## Examples

### Cross-tab theme sync

```svelte
<script lang="ts">
	import { useBroadcastChannel } from '@wynn-dev/svelte-use';

	const bus = useBroadcastChannel<string, string>({ name: 'theme' });
	let theme = $state('light');

	$effect(() => {
		if (bus.data) theme = bus.data;
	});
</script>

<button onclick={() => bus.post(theme === 'light' ? 'dark' : 'light')}>
	{theme}
</button>
```

### Logout everywhere

```svelte
<script lang="ts">
	import { useBroadcastChannel } from '@wynn-dev/svelte-use';

	const bus = useBroadcastChannel<string, string>({ name: 'auth' });

	$effect(() => {
		if (bus.data === 'logout') signOut();
	});

	function signOutEverywhere() {
		signOut();
		bus.post('logout');
	}
</script>
```

### SSR behavior

`isSupported` is `false`, the channel never opens, and `post`/`close` are
safe no-ops. Gate live features on `isSupported`.

## Edge cases & cleanup

- **The channel opens in an effect, not at setup.** Mounting constructs it, so
  server rendering (where effects never run) stays clean and unmount closes
  it — matching upstream's `tryOnMounted` / `tryOnScopeDispose` pair.
- **`close()` and unmount both end it.** Either path closes the instance,
  detaches the listeners, and marks `isClosed`.
- **`post` before open is a no-op**, not a throw — there is no buffer, unlike
  `useWebSocket`. Call `post` after mount.
- **A closed channel stays closed.** Posting to it does nothing; reopening
  needs a fresh `useBroadcastChannel` call.
- Must be called in component initialization (uses `$state` / `$effect`).

## VueUse parity notes

- **No `window` option.** Upstream accepts one via `ConfigurableWindow`; every
  util in this package reads the global behind `isBrowser` instead.
- **`isSupported` probes callable, not merely present.** `typeof
BroadcastChannel === 'function'` — a stub exposing the name as `undefined`
  reports unsupported instead of throwing on `new`.
- **One documented `any`-boundary.** `MessageEvent.data` is typed `any` in
  lib.dom; the caller names `D`, so the single assignment is the boundary
  (same rationale as `useCloned`'s one cast). A structural `isMessageEvent`
  guard (new in `shared/is.ts`) narrows the event first.
- Source analyzed: `vueuse/packages/core/useBroadcastChannel/index.ts`.
