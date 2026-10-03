# `useObjectUrl`

Create an object URL for a `Blob` / `MediaSource` and revoke it automatically.

> Ported from [`vueuse/core/useObjectUrl`](https://github.com/vueuse/vueuse/tree/main/packages/core/useObjectUrl).

## Signature

```ts
import { useObjectUrl } from '@wynn-dev/svelte-use';

const staticUrl = useObjectUrl(someBlob);

const source = $state<Blob | undefined>();
const reactiveUrl = useObjectUrl(() => source.value);
```

## Options

None. Pass the object directly, or a getter that returns it.

## Returns

| Field   | Type                  | Reactivity                                                          |
| ------- | --------------------- | ------------------------------------------------------------------- |
| `value` | `string \| undefined` | Getter-backed; `undefined` while a nullish source or on the server. |

## Examples

### Preview a picked file

```svelte
<script lang="ts">
	import { useObjectUrl } from '@wynn-dev/svelte-use';

	let file = $state<File>();
	const url = useObjectUrl(() => file);
</script>

<input type="file" onchange={(e) => (file = e.currentTarget.files?.[0])} />

{#if url}
	<img {url} alt={file?.name} />
{/if}
```

### Attach a blob to a download link

```svelte
<script lang="ts">
	import { useObjectUrl } from '@wynn-dev/svelte-use';

	const report = useObjectUrl(() => new Blob([csv], { type: 'text/csv' }));
</script>

<a href={report} download="report.csv">download</a>
```

## Edge cases & cleanup

- Every URL is revoked when the source changes and again on unmount, so no blob
  URL outlives the component that created it.
- Each effect run remembers the URL it created, so a swap revokes the URL that is
  actually being replaced rather than whichever one happens to be current.
- A nullish source clears `value` and revokes the previous URL.
- No listeners, observers or timers.

## Parity notes

- **`effect` instead of `watch`.** VueUse creates the URL inside a `watch` with
  `immediate: true`, which fires before the element is mounted. Here the work
  happens in an `$effect`, so a component that renders the URL still gets a value
  on its first paint — the common case for a file preview.
- **No `AutoDispose` flag.** VueUse offers `autoDispose` so a caller can keep a
  URL alive past unmount. That is the plain DOM here: hold the object, call
  `URL.createObjectURL` yourself, and revoke it when you are done.
- **SSR-safe by construction.** `$effect` never runs on the server, so `value`
  reports `undefined` during SSR without a separate guard.
