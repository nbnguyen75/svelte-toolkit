# `useCssSupports`

Feature-detect CSS through `CSS.supports`, reactively.

> Ported from [`vueuse/core/useCssSupports`](https://github.com/vueuse/vueuse/tree/main/packages/core/useCssSupports).

## Signature

```ts
import { useCssSupports } from '@wynn-dev/svelte-use';

// property / value pair
const grid = useCssSupports('display', 'grid');

// whole condition
const container = useCssSupports('container-type: inline-size');

// reactive inputs
const prop = $state('display');
const grid = useCssSupports(() => prop, 'grid');
```

## Options

| Option     | Type      | Default | Description                                                                    |
| ---------- | --------- | ------- | ------------------------------------------------------------------------------ |
| `ssrValue` | `boolean` | `false` | Reported while rendering on the server and before the first client effect run. |

The two-argument form takes `UseCssSupportsOptions` as its third parameter.

## Returns

| Field         | Type      | Reactivity                                               |
| ------------- | --------- | -------------------------------------------------------- |
| `isSupported` | `boolean` | Getter-backed; re-evaluates when a getter input changes. |

## Examples

### Feature-detect a declaration

```svelte
<script lang="ts">
	import { useCssSupports } from '@wynn-dev/svelte-use';

	const grid = useCssSupports('display', 'grid');
</script>

<p>{grid.isSupported ? 'using grid' : 'falling back to flex'}</p>
```

### Guard a declaration against an `@supports` block

```svelte
<script lang="ts">
	import { useCssSupports } from '@wynn-dev/svelte-use';

	const supportsAnchor = useCssSupports('anchor-name: --card');
</script>

<div class:anchor={supportsAnchor.isSupported} style="anchor-name: --card">…</div>
```

### SSR behavior

On the server there is no `CSS` object to ask, so `isSupported` reports
`ssrValue`. The real answer arrives after the first client effect run. Pass
`ssrValue: true` when the server should render the "supported" branch — the
value you pass must match what the server rendered, or hydration will disagree.

## Edge cases & cleanup

- No listeners, observers or timers: the probe is a pure function read, so
  there is nothing to release on unmount.
- An unknown property or a malformed condition string reports `false`. That is
  `CSS.supports` itself deciding, not a fallback here.
- The two forms are picked by the _type_ of the second argument — a plain
  object is read as options. Passing an explicitly `undefined` value is a
  compile error rather than a silent switch to the wrong overload.

## Parity notes

- **Overloads are resolved by TypeScript, not by argument count.** VueUse pops
  the last argument when its runtime type is an object, which makes
  `useCssSupports('display: flex', undefined)` silently evaluate as a
  property/value pair and report `false`. The overloads here reject that call.
- **The mount gate is kept.** VueUse defers to `ssrValue` until `useMounted()`
  flips; the same gate is a single `$effect` here. Without it, anything rendered
  from `isSupported` would mismatch between the server HTML and the client.
- **No `window` option.** The probe uses the ambient `CSS` global, guarded by
  `isBrowser`.
