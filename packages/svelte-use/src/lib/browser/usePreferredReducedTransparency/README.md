# `usePreferredReducedTransparency`

Reactive `prefers-reduced-transparency` preference, built on Svelte's
`MediaQuery` primitive. Inspired by
[VueUse `usePreferredReducedTransparency`](https://vueuse.org/core/usePreferredReducedTransparency/).

## Signature

```ts
import { usePreferredReducedTransparency } from '@wynn-dev/svelte-use';

const transparency = usePreferredReducedTransparency();
transparency.value; // 'no-preference' | 'reduce'
```

## Options

None.

## Returns

| Field   | Type                                   | Reactive | Description                      |
| ------- | -------------------------------------- | -------- | -------------------------------- |
| `value` | `UsePreferredReducedTransparencyValue` | getter   | `'no-preference'` or `'reduce'`. |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { usePreferredReducedTransparency } from '@wynn-dev/svelte-use';

	const transparency = usePreferredReducedTransparency();
</script>

<div class:reduced-transparency={transparency.value === 'reduce'}>
	<slot />
</div>
```

### Softer animations

```svelte
<script lang="ts">
	import { usePreferredReducedTransparency } from '@wynn-dev/svelte-use';

	const transparency = usePreferredReducedTransparency();
	const duration = $derived(transparency.value === 'reduce' ? '0ms' : '400ms');
</script>

<button style:transition-duration={duration}>Save</button>
```

## Edge cases & cleanup

- Backed by one `MediaQuery` per call, matching `useDark`. The subscription is
  released automatically when the reading effect is destroyed — nothing to
  dispose by hand.
- **SSR:** `MediaQuery` needs `window.matchMedia`, which does not exist on the
  server. `value` is `'no-preference'` there, so markup that depends on it must
  not be assumed to match the client. Gate server-sensitive rendering yourself,
  or express the preference in CSS via `@media (prefers-reduced-transparency: reduce)`.
- Unlike `useDark`, the initial client value is read synchronously rather than
  after mount, so a wide-open client render can differ from the server output.
  Reach for the CSS media query when that matters — it needs no JavaScript and
  no hydration story.
- `prefers-reduced-transparency` is still an emerging media feature. Browsers
  that do not support it never match, so `value` stays `'no-preference'`.
- Must be called in component initialization (uses `$state`).

## Parity notes

- Matches VueUse's two-value model. Some tooling exposes a three-state
  `reduced | no-preference | forced-colors` union; that is left out because
  this query only reports the first two.
- No `ssrWidth`-style option: unlike `useBreakpoints` there is nothing to
  configure, so an option would be dead weight.
