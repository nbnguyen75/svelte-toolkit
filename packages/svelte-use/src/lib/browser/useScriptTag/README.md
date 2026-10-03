# `useScriptTag`

Load a `<script src>` once, deduplicated by URL, and remove it on unmount.

> Ported from [`vueuse/core/useScriptTag`](https://github.com/vueuse/vueuse/tree/main/packages/core/useScriptTag).

## Signature

```ts
import { useScriptTag } from '@wynn-dev/svelte-use';

const lib = useScriptTag('https://cdn.example/lib.js', (el) => console.log('ready', el));

await lib.load(); // injected, resolved on the element's load event
await lib.load(false); // resolved as soon as it is in <head>
lib.unload();

// caller-driven lifetime
const manual = useScriptTag('https://cdn.example/lib.js', undefined, { manual: true });
```

## Parameters

| Parameter  | Type                              | Description                                                     |
| ---------- | --------------------------------- | --------------------------------------------------------------- |
| `src`      | `MaybeGetter<string>`             | Script URL, or a getter returning it. Re-resolved on each load. |
| `onLoaded` | `(el: HTMLScriptElement) => void` | Called with the element once it has loaded.                     |
| `options`  | [`UseScriptTagOptions`](#options) | See below.                                                      |

## Options

| Option           | Type                               | Default             | Description                                                          |
| ---------------- | ---------------------------------- | ------------------- | -------------------------------------------------------------------- |
| `immediate`      | `boolean`                          | `true`              | Load on mount.                                                       |
| `manual`         | `boolean`                          | `false`             | Take over `load` / `unload`; nothing loads or is removed on unmount. |
| `type`           | `string`                           | `'text/javascript'` | `type` attribute.                                                    |
| `async`          | `boolean`                          | `true`              | `async` attribute.                                                   |
| `defer`          | `boolean`                          | —                   | `defer` attribute.                                                   |
| `noModule`       | `boolean`                          | —                   | `noModule` attribute.                                                |
| `crossOrigin`    | `'anonymous' \| 'use-credentials'` | —                   | `crossorigin` attribute.                                             |
| `referrerPolicy` | `string`                           | —                   | `referrerpolicy` attribute.                                          |
| `nonce`          | `string`                           | —                   | CSP nonce.                                                           |
| `attrs`          | `Record<string, string>`           | —                   | Extra attributes set on the created element.                         |

## Returns

| Field       | Type                                                                   | Reactivity                                                  |
| ----------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| `scriptTag` | `HTMLScriptElement \| undefined`                                       | Getter-backed; `undefined` before load and after unload.    |
| `load`      | `(waitForScriptLoad?: boolean) => Promise<HTMLScriptElement \| false>` | Memoized per load/unload cycle.                             |
| `unload`    | `() => void`                                                           | Removes the element and lets a later `load()` inject again. |

## Examples

### Load on mount

```svelte
<script lang="ts">
	import { useScriptTag } from '@wynn-dev/svelte-use';

	useScriptTag('https://cdn.example/analytics.js');
</script>
```

### Load on demand, then clean up

```svelte
<script lang="ts">
	import { useScriptTag } from '@wynn-dev/svelte-use';

	const map = useScriptTag('https://cdn.example/map.js', undefined, { manual: true });

	async function showMap() {
		await map.load();
	}
</script>

<button onclick={showMap}>show map</button>
```

### Load a widget without blocking render

```ts
const widget = useScriptTag('https://cdn.example/widget.js', undefined, { async: true });

// Resolve as soon as the tag is in <head>, rather than when it has executed.
await widget.load(false);
```

## Edge cases & cleanup

- A `<script>` already in the document for the same URL is adopted instead of a
  second tag being injected, so two components asking for one file share it.
- A tag that already finished carries `data-loaded`; a later caller resolves
  immediately rather than waiting for an event that has already fired.
- The in-flight promise is memoized per cycle, so repeat calls cannot inject two
  elements. `load(false)` after an auto-load therefore does **not** downgrade a
  load that is already waiting — it returns the same promise.
- `error` and `abort` reject with the event; the first event to settle owns the
  promise, and every listener is removed once it does.
- `unload()` removes the element this instance holds, so a `src` getter that has
  moved on since load cannot strand the old tag.
- Automatic mode removes the element on unmount; `manual` mode leaves it in place.

## Parity notes

- **Lookup avoids `querySelector`.** VueUse matches with
  `script[src="${CSS.escape(url)}"]`. `CSS.escape` is for identifiers, not quoted
  attribute values, so the escaped text does not reliably compare equal to a real
  URL — and the match silently misses, which shows up as a duplicate tag rather
  than as an error. The lookup here filters the existing `<script>` elements and
  compares resolved `src` values, so a relative `src` in markup still matches.
- **The existing-tag check is `tagName`, not a duck-typed property.** VueUse tests
  `'noModule' in el`, which is not a property jsdom implements on
  `HTMLScriptElement`, so the check fails in a jsdom-based test run.
- **Listeners are plain, not `useEventListener`.** That util creates an
  `$effect`, and `load()` is reachable from an ordinary click handler in `manual`
  mode — an effect cannot be constructed from a promise executor. These are
  one-shot listeners removed on settle.
- **No module-level element cache.** VueUse keeps a shared
  `elementByUrl` / `loadedByUrl` map so repeat loads across instances share one
  tag and promise. That is module-scope mutable state, so deduplication here is
  document-based (adopting the tag in the DOM) and per-instance.
- **SSR resolves `false`** rather than rejecting, so a caller awaiting during
  render is not left hanging.
