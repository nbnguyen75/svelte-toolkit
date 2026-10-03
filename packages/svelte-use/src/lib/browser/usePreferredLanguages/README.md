# `usePreferredLanguages`

Reactive `navigator.languages`, refreshed on the browser's `languagechange`
event. Inspired by [VueUse `usePreferredLanguages`](https://vueuse.org/core/usePreferredLanguages/).

## Signature

```ts
import { usePreferredLanguages } from '@wynn-dev/svelte-use';

const languages = usePreferredLanguages();
languages.value; // readonly string[]
```

## Options

None. VueUse hardcodes `['en']` as its server value, so it is a module
constant here rather than an option.

## Returns

| Field   | Type                | Reactive | Description                                    |
| ------- | ------------------- | -------- | ---------------------------------------------- |
| `value` | `readonly string[]` | getter   | `navigator.languages`, or `['en']` during SSR. |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { usePreferredLanguages } from '@wynn-dev/svelte-use';

	const languages = usePreferredLanguages();
</script>

<ul>
	{#each languages.value as language}
		<li>{language}</li>
	{/each}
</ul>
```

### Gate content per language

```svelte
<script lang="ts">
	import { usePreferredLanguages } from '@wynn-dev/svelte-use';

	const languages = usePreferredLanguages();
	const isGerman = $derived(languages.value[0]?.startsWith('de') ?? false);
</script>

{#if isGerman}
	<p>Hallo!</p>
{/if}
```

## Edge cases & cleanup

- The listener is attached through `useEventListener`, so it is removed on
  unmount; a late `languagechange` after unmount is ignored.
- Only `languagechange` is observed. A raw `navigator.language` change that does
  not fire the event is not picked up, same as in VueUse.
- The value is passed through verbatim — no normalisation, no deduplication, no
  sorting. `navigator.languages` is already ordered by preference.
- On the server `value` is `['en']` and no listener is attached.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- Returns `readonly string[]` rather than a writable ref: language order comes
  from the user agent, not from your app.
- VueUse's `['en']` server fallback is kept verbatim so the SSR markup matches.
