# `useUrlSearchParams`

Reactive URL search params, synced both ways with the address bar. Inspired by
[VueUse `useUrlSearchParams`](https://vueuse.org/core/useUrlSearchParams/).

## Signature

```ts
import { useUrlSearchParams } from '@wynn-dev/svelte-use';

const params = useUrlSearchParams('history');
params.page = '2';

console.log(params.page);
```

## Options

| Option                | Type                                   | Default             | Description                                              |
| --------------------- | -------------------------------------- | ------------------- | -------------------------------------------------------- |
| `mode`                | `'history' \| 'hash' \| 'hash-params'` | `'history'`         | Where the params live.                                   |
| `removeNullishValues` | `boolean`                              | `true`              | Drop nullish values when writing.                        |
| `removeFalsyValues`   | `boolean`                              | `false`             | Drop falsy values when writing.                          |
| `initialValue`        | `UrlParams`                            | `{}`                | Starting state when the URL holds no params.             |
| `write`               | `boolean`                              | `true`              | Read external URL changes (back/forward) into the state. |
| `writeMode`           | `'replace' \| 'push'`                  | `'replace'`         | Rewrite the entry, or push a new one.                    |
| `stringify`           | `(params: URLSearchParams) => string`  | `params.toString()` | Custom serializer, without leading `?` or `#`.           |

## Returns

The params record itself — `UrlParams`, a `Record<string, string[] | string>`.
There is no getter wrapper, because the keys are dynamic: **read and assign
its keys directly.** A repeated key reads as an array; a missing key reads as
`''` after the first sync (matching upstream).

## Examples

### Paginated list

```svelte
<script lang="ts">
	import { useUrlSearchParams } from '@wynn-dev/svelte-use';

	const params = useUrlSearchParams('history');
	const page = $derived(Number(params.page ?? 1));
</script>

<button onclick={() => (params.page = String(page + 1))}>Next</button>
```

### Hash-scoped filters

```svelte
<script lang="ts">
	import { useUrlSearchParams } from '@wynn-dev/svelte-use';

	// Lives in `#tag=…`, so the server route never sees it.
	const filters = useUrlSearchParams('hash-params');
</script>

<input bind:value={filters.tag} />
```

### SSR behavior

Starts from `initialValue` and edits stay local — nothing is read and nothing
is written without a window. Hydration re-reads the live URL on mount.

## Edge cases & cleanup

- **Mounting never writes.** The write-back effect is created before the
  initial read runs, so a flag holds it until the URL has been absorbed —
  otherwise mounting alone would overwrite the query (and push a duplicate
  entry in `push` mode).
- **In-sync states never write back.** A state that just came _from_ the URL
  serializes identically and is skipped, so back/forward absorption does not
  echo, and neither does the initial read.
- **The known-key set is plain, not state.** The sync runs inside effects, and
  an effect that reads `Object.keys(state)` while also writing `state`
  invalidates itself forever (`effect_update_depth_exceeded`) — this exact
  loop shipped in the first draft and a test mount hung on it.
- **External navigation is absorbed, not echoed.** `popstate` (plus
  `hashchange` outside `history` mode) re-reads the URL into the state; the
  write-back skips it as in-sync.
- **Listeners release on unmount.** There is no public `stop()` — like
  upstream, this syncs for the life of the component.
- Must be called in component initialization (uses `$state` / `$effect`).

## VueUse parity notes

- **No `window` option.** Upstream accepts one via `ConfigurableWindow`; every
  util in this package reads the global behind `isBrowser` instead.
- **No `T` generic.** Upstream types the record as `T extends Record<string,
any>`; this package's `no-unsafe-type-assertion` rejects casting to a
  generic target, so the record is concretely `UrlParams`. Wrap it in your own
  typed accessor if you need narrower types.
- **No pause/resume machinery.** Upstream's `watchPausable` exists because its
  watcher would echo external changes back; here the in-sync skip covers the
  same case with no extra state.
- Source analyzed: `vueuse/packages/core/useUrlSearchParams/index.ts`.
