# `useClipboard`

Clipboard copy helper with a reactive "recently copied" flag.
Inspired by [VueUse `useClipboard`](https://vueuse.org/core/useClipboard/).

## Signature

```ts
import { useClipboard } from '@wynn-dev/svelte-use';

const { copied, text, isSupported, copy } = useClipboard({ copiedDuring: 1500 });
await copy('hello');
```

## Options

| Option         | Type     | Default | Description                                      |
| -------------- | -------- | ------- | ------------------------------------------------ |
| `copiedDuring` | `number` | `1500`  | Milliseconds `copied` stays `true` after a copy. |

## Returns

| Field         | Type                               | Reactive | Description                                                |
| ------------- | ---------------------------------- | -------- | ---------------------------------------------------------- |
| `copied`      | `boolean`                          | getter   | `true` while inside the post-copy window.                  |
| `text`        | `string`                           | getter   | Last successfully copied text.                             |
| `isSupported` | `boolean`                          | const    | Async Clipboard API available (always `false` during SSR). |
| `copy`        | `(value: string) => Promise<void>` | method   | Copy `value`; safe no-op when unsupported.                 |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useClipboard } from '@wynn-dev/svelte-use';

	const clipboard = useClipboard();
</script>

<button onclick={() => clipboard.copy('copy me')}>
	{clipboard.copied ? 'Copied!' : 'Copy'}
</button>
```

### SSR behavior

`isSupported` is `false` on the server and `copy()` resolves without doing
anything, so copy buttons render safely during SSR.

## Edge cases & cleanup

- Repeat copies re-arm the reset window; only the latest text is kept.
- The reset timer is disposed on unmount, and copies resolving after
  unmount are dropped — no stale writes to dead state.
- Clipboard writes require a secure context and user gesture; failures
  reject the `copy()` promise to the caller (state is only updated after a
  successful write). Catch it if your handler is not already handling errors.
- `isSupported` is a snapshot, not reactive: it reflects whether
  `navigator.clipboard` existed when the util was created.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- Simplified versus VueUse: modern async Clipboard API only — no legacy
  `execCommand` fallback, no `read()`/cut support, no configurable legacy
  copy shim, and no `copyPending` flag. See `useClipboardItems` (feat-023)
  for multi-item support.
- VueUse swallows a denied write; this port lets the rejection reach the
  caller, since `copy` already returns a `Promise<void>`.
