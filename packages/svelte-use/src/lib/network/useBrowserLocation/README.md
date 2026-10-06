# `useBrowserLocation`

Reactive browser location, rebuilt on every navigation. Inspired by
[VueUse `useBrowserLocation`](https://vueuse.org/core/useBrowserLocation/).

## Signature

```ts
import { useBrowserLocation } from '@wynn-dev/svelte-use';

const location = useBrowserLocation();

console.log(location.pathname);
```

## Options

None. The address bar is the only input.

## Returns

| Field             | Type                                   | Reactive      | Description                             |
| ----------------- | -------------------------------------- | ------------- | --------------------------------------- |
| `trigger`         | `'load' \| 'popstate' \| 'hashchange'` | getter        | Which navigation produced the snapshot. |
| `state`           | `unknown`                              | getter        | `history.state` at snapshot time.       |
| `length`          | `number \| undefined`                  | getter        | `history.length` at snapshot time.      |
| `origin`          | `string \| undefined`                  | getter        | `location.origin` at snapshot time.     |
| `hash` … `search` | `string \| undefined`                  | getter+setter | The 8 writable URL parts (see below).   |

The writable parts are `hash`, `host`, `hostname`, `href`, `pathname`, `port`,
`protocol`, `search`. Assigning one navigates — exactly what assigning
`window.location.hash = '#x'` does, because that is what it calls.

## Examples

### Active nav link

```svelte
<script lang="ts">
	import { useBrowserLocation } from '@wynn-dev/svelte-use';

	const location = useBrowserLocation();
</script>

<a href="/billing" class:active={location.pathname === '/billing'}>Billing</a>
```

### Jump to an anchor

```svelte
<script lang="ts">
	import { useBrowserLocation } from '@wynn-dev/svelte-use';

	const location = useBrowserLocation();
</script>

<button onclick={() => (location.hash = '#pricing')}>See pricing</button>
```

### SSR behavior

Renders `trigger: 'load'` with every other field `undefined`, and the setters
are safe no-ops. Hydration snapshots the live location on mount.

## Edge cases & cleanup

- **A write that changes nothing is skipped.** Assigning the value already in
  the bar does not navigate and does not re-fire `hashchange` for nothing.
- **`undefined` assignments are ignored.** There is no URL part `undefined` to
  navigate to; assigning one is a no-op rather than a throw.
- **Listeners release on unmount** (`popstate` always, `hashchange` too).
  There is no public `stop()` — like upstream, this tracks for the life of
  the component.
- Must be called in component initialization (uses `$state` / `$effect`).

## VueUse parity notes

- **No `window` option.** Upstream accepts one via `ConfigurableWindow`; every
  util in this package reads the global behind `isBrowser` instead.
- **`state` is `unknown`, not `any`.** `history.state` can hold anything, and
  this package has a zero-`any` rule — narrow it at the call site.
- **One snapshot object, rebuilt per navigation** — matching upstream's
  replaced ref, rather than one `$state` per field that could disagree
  mid-navigation.
- Source analyzed: `vueuse/packages/core/useBrowserLocation/index.ts`.
