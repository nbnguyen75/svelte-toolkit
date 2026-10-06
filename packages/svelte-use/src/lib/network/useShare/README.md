# `useShare`

Reactive Web Share API. Inspired by
[VueUse `useShare`](https://vueuse.org/core/useShare/).

## Signature

```ts
import { useShare } from '@wynn-dev/svelte-use';

const { share, isSupported } = useShare({ title: 'Score' });

if (isSupported) await share({ text: 'I won' });
```

## Options

`MaybeGetter<T>` inputs accept a plain value or a `() => value` getter.

| Option         | Type                                         | Default | Description                                  |
| -------------- | -------------------------------------------- | ------- | -------------------------------------------- |
| `shareOptions` | `UseShareOptions \| (() => UseShareOptions)` | `{}`    | Default payload, re-read on every `share()`. |

| `UseShareOptions` field | Type     | Default     | Description   |
| ----------------------- | -------- | ----------- | ------------- |
| `title`                 | `string` | `undefined` | Shared title. |
| `files`                 | `File[]` | `undefined` | Shared files. |
| `text`                  | `string` | `undefined` | Shared text.  |
| `url`                   | `string` | `undefined` | Shared URL.   |

## Returns

| Field         | Type                                  | Reactive | Description                                          |
| ------------- | ------------------------------------- | -------- | ---------------------------------------------------- |
| `isSupported` | `boolean`                             | —        | Whether sharing can be attempted. `false` in SSR.    |
| `share`       | `(overrideOptions?) => Promise<void>` | —        | Share, with overrides merged over the setup options. |

## Examples

### Share button

```svelte
<script lang="ts">
	import { useShare } from '@wynn-dev/svelte-use';

	const { share, isSupported } = useShare({
		title: 'My score',
		url: 'https://example.com/scores/7'
	});
</script>

{#if isSupported}
	<button onclick={() => share({ text: 'Beat that' })}>Share</button>
{/if}
```

### Per-share payload

```svelte
<script lang="ts">
	import { useShare } from '@wynn-dev/svelte-use';

	let quote = $state('Be kind');
	const { share } = useShare(() => ({ text: quote }));
</script>

<button onclick={() => share()}>Share this quote</button>
```

### SSR behavior

`isSupported` is `false` and `share()` resolves without doing anything. Gate
the button on `isSupported` and nothing share-shaped renders on the server.

## Edge cases & cleanup

- **Resolves, never throws, when unsupported.** No `navigator`, no `canShare`,
  or a platform decline (`canShare(data)` is `false`) all resolve
  `undefined` — matching upstream, which only calls `share()` on a grant.
- **Capability is probed callable, not merely present.** A stub exposing
  `canShare` as `undefined` reports unsupported instead of throwing on the
  call.
- **No timers, listeners, or subscriptions.** There is nothing to stop and
  nothing leaks; `share()` is a plain async function.
- Must be called in component initialization (house convention; this util
  itself uses no runes).

## VueUse parity notes

- **No `navigator` option.** Upstream accepts one via `ConfigurableNavigator`;
  every util in this package reads the global behind `isBrowser` instead.
- **`shareOptions` accepts a getter**, which upstream's `MaybeRefOrGetter`
  already allowed. A plain object still works.
- Source analyzed: `vueuse/packages/core/useShare/index.ts`.
