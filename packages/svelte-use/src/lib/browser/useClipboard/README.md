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

| Field         | Type                                                 | Reactive | Description                                                |
| ------------- | ---------------------------------------------------- | -------- | ---------------------------------------------------------- |
| `copied`      | `boolean`                                            | getter   | `true` while inside the post-copy window.                  |
| `text`        | `string`                                             | getter   | Last successfully copied text.                             |
| `isSupported` | `boolean`                                            | const    | Async Clipboard API available (always `false` during SSR). |
| `copy`        | `(value: string \| ClipboardItems) => Promise<void>` | method   | Copy text or rich items; safe no-op when unsupported.      |

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

### Rich content (images, custom MIME types)

`copy` accepts `ClipboardItems` as well as a string, so a "copy image" button
needs no second util:

```ts
const { copy, copied } = useClipboard();

await copy([new ClipboardItem({ 'image/png': pngBlob })]);
```

A rich copy still flashes `copied` for the same window, and leaves `text` alone
— there is no text form of the content to report.

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
  `execCommand` fallback, no cut support, no configurable legacy copy shim, and
  no `copyPending` flag.
- VueUse ships a separate `useClipboardItems` for rich content. That module is
  not ported; `copy` here takes `string | ClipboardItems` instead, so the write
  path is covered without duplicating `copied`, `copiedDuring` and
  `isSupported`. The _read_ side is a recipe, not a util: a native `onpaste`
  handler receives `event.clipboardData` with no clipboard-read permission,
  where VueUse's `useClipboardItems` listens on `copy`/`cut` and calls
  `navigator.clipboard.read()`, prompting for permission on every copy.
- VueUse swallows a denied write; this port lets the rejection reach the
  caller, since `copy` already returns a `Promise<void>`.
