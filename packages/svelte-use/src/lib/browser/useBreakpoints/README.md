# `useBreakpoints`

Reactive viewport breakpoints built on Svelte's `MediaQuery` primitive.
Inspired by [VueUse `useBreakpoints`](https://vueuse.org/core/useBreakpoints/).

## Signature

```ts
import { breakpointsTailwind, useBreakpoints } from '@wynn-dev/svelte-use';

const bp = useBreakpoints(breakpointsTailwind);

bp.md; // boolean, true at 768px and wider
bp.active(); // 'sm' | 'md' | 'lg' | ''
bp.greater('lg'); // true only past lg
bp.between('sm', 'lg'); // sm up to (not including) lg
bp.current(); // every matching key, ascending
```

## Options

| Option     | Type                         | Default       | Description                                                    |
| ---------- | ---------------------------- | ------------- | -------------------------------------------------------------- |
| `strategy` | `'min-width' \| 'max-width'` | `'min-width'` | `'min-width'` is mobile-first, `'max-width'` is desktop-first. |

Pass options as the second argument:

```ts
useBreakpoints({ sm: 640, lg: 1024 }, { strategy: 'max-width' });
```

## Returns

`UseBreakpointsReturn<K>` is a `Record<K, boolean>` — one reactive getter per
breakpoint key — plus these methods.

| Method              | Returns   | Description                                     |
| ------------------- | --------- | ----------------------------------------------- |
| `active()`          | `K \| ''` | Best single match, or `''` outside every range. |
| `between(a, b)`     | `boolean` | From `a` inclusive to `b` exclusive.            |
| `current()`         | `K[]`     | Every matching key, ascending by width.         |
| `greater(k)`        | `boolean` | Strictly wider than `k`.                        |
| `greaterOrEqual(k)` | `boolean` | `k` or wider.                                   |
| `smaller(k)`        | `boolean` | Strictly narrower than `k`.                     |
| `smallerOrEqual(k)` | `boolean` | `k` or narrower.                                |

Each method takes a key or a getter returning one, so a reactive key works:

```ts
bp.greaterOrEqual(() => (wide.value ? 'lg' : 'sm'));
```

## Examples

### Tailwind breakpoints

```svelte
<script lang="ts">
	import { breakpointsTailwind, useBreakpoints } from '@wynn-dev/svelte-use';

	const bp = useBreakpoints(breakpointsTailwind);
</script>

<p>viewport: {bp.active() || 'below sm'}</p>
<p>desktop: {bp.greaterOrEqual('lg')}</p>
<p>phone sized: {bp.smaller('md')}</p>
```

### Custom map, desktop-first

```svelte
<script lang="ts">
	import { useBreakpoints } from '@wynn-dev/svelte-use';

	const bp = useBreakpoints({ sm: 640, lg: 1024 }, { strategy: 'max-width' });
</script>

{#if bp.greater('lg')}
	<Wide />
{:else}
	<Narrow />
{/if}
```

### Units

Values are CSS lengths. A bare number is pixels; a string keeps its unit.
`rem` is resolved for ordering only, assuming a 16px root, matching VueUse.

```ts
useBreakpoints({ sm: 640, wide: '80rem' }); // 80rem -> 1280px for ordering
```

## Edge cases & cleanup

- Every helper returns a plain `boolean`/`''`, not a ref, because
  `MediaQuery.current` is already reactive. Read inside a template,
  `$derived`, or `$effect` to subscribe.
- Media queries are built lazily and cached per query string, so a component
  reading `bp.md` a hundred times opens one `matchMedia`. The cache is bounded
  by the call sites and collected with the closure.
- On the server every helper is `false` / `''`, matching VueUse's `ssrWidth: 0`.
  Gate server-sensitive markup yourself if you need a real width.
- A missing key resolves to `0px` instead of producing a `(min-width: undefinedpx)`
  invalid query.
- No manual teardown: subscriptions live and die with the reading effect.

## Parity notes

- VueUse exposes two families — `greater`/`isGreater`, `smaller`/`isSmaller`,
  plus `isBetween`. They collapse to one set here because the refs add nothing
  once the underlying query is reactive.
- Shorthand keys are plain booleans rather than VueUse's per-key
  `{ ref, isGreater }` objects, and are also enumerable — so
  `Object.keys(bp)` is your breakpoint list.
- Only the Tailwind preset ships (`breakpointsTailwind`); other framework
  scales are trivial maps to pass in.
