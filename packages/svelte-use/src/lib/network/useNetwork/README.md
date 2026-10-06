# `useNetwork`

Reactive network status: online/offline plus the Network Information API.
Inspired by [VueUse `useNetwork`](https://vueuse.org/core/useNetwork/).

## Signature

```ts
import { useNetwork } from '@wynn-dev/svelte-use';

const net = useNetwork();

console.log(net.isOnline, net.effectiveType);
```

## Options

None. The browser is the only input.

## Returns

| Field           | Type                                | Reactive | Description                                                    |
| --------------- | ----------------------------------- | -------- | -------------------------------------------------------------- |
| `isSupported`   | `boolean`                           | —        | Whether the Network Information API is usable. `false` in SSR. |
| `isOnline`      | `boolean`                           | getter   | What the browser reports.                                      |
| `offlineAt`     | `number \| undefined`               | getter   | When it last went offline.                                     |
| `onlineAt`      | `number \| undefined`               | getter   | When it last came online.                                      |
| `downlink`      | `number \| undefined`               | getter   | Download speed in Mbps.                                        |
| `downlinkMax`   | `number \| undefined`               | getter   | Max reachable download speed in Mbps.                          |
| `effectiveType` | `NetworkEffectiveType \| undefined` | getter   | `'slow-2g' \| '2g' \| '3g' \| '4g'`.                           |
| `rtt`           | `number \| undefined`               | getter   | Estimated round-trip time in ms.                               |
| `saveData`      | `boolean \| undefined`              | getter   | Whether data-saver mode is on.                                 |
| `type`          | `NetworkType`                       | getter   | Connection kind, `'unknown'` when unreported.                  |

## Examples

### Offline banner

```svelte
<script lang="ts">
	import { useNetwork } from '@wynn-dev/svelte-use';

	const net = useNetwork();
</script>

{#if !net.isOnline}
	<p>Offline since {net.offlineAt} — changes will sync later.</p>
{/if}
```

### Degrade on slow connections

```svelte
<script lang="ts">
	import { useNetwork } from '@wynn-dev/svelte-use';

	const net = useNetwork();
	const lite = $derived(
		net.saveData || net.effectiveType === 'slow-2g' || net.effectiveType === '2g'
	);
</script>

{#if lite}
	<p>Lite mode: images off.</p>
{/if}
```

### SSR behavior

Renders the offline-safe defaults: `isSupported: false`, `isOnline: true`,
`type: 'unknown'`, everything else `undefined`. No listeners bind on the
server, and hydration re-reads the live values on mount.

## Edge cases & cleanup

- **One shared update path.** `online`, `offline`, and the connection `change`
  event all run the same `update()`, which re-reads `navigator.onLine` and the
  connection object together — so the timestamps and the connection info can
  never disagree about which event they came from.
- **The connection object is probed, not cast.** `navigator.connection` is
  untyped in lib.dom; a stub exposing the name with neither the info surface
  nor listener plumbing reports `isSupported: false` instead of throwing.
- **Listeners release on unmount** via the binding effect's cleanup. There is
  no public `stop()` — like upstream, this tracks for the life of the
  component.
- Must be called in component initialization (uses `$state` / `$effect`).

## VueUse parity notes

- **No `window` option.** Upstream accepts one via `ConfigurableWindow`; every
  util in this package reads the global behind `isBrowser` instead.
- **`isSupported` means usable, not merely present.** Upstream checks
  `'connection' in navigator`; this also requires the info and listener
  surfaces, because binding to a name-only stub would throw.
- Source analyzed: `vueuse/packages/core/useNetwork/index.ts`.
