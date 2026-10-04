# useFileDialog

Open a file dialog from a handler, without an `<input type="file">` in the
template. Returns the picked `FileList` reactively.

## Signature

```ts
function useFileDialog(options?: UseFileDialogOptions): UseFileDialogReturn;
```

## Parameters

| Name      | Type                   | Default | Notes      |
| --------- | ---------------------- | ------- | ---------- |
| `options` | `UseFileDialogOptions` | `{}`    | See below. |

### `UseFileDialogOptions`

| Option      | Type                                | Default | Notes                                                                     |
| ----------- | ----------------------------------- | ------- | ------------------------------------------------------------------------- |
| `multiple`  | `boolean`                           | `true`  | Allow selecting more than one file.                                       |
| `accept`    | `string`                            | `'*'`   | Comma-separated types or extensions, e.g. `'image/*,.pdf'`.               |
| `capture`   | `string`                            | unset   | Which camera a capture prompt offers, e.g. `'user'`.                      |
| `reset`     | `boolean`                           | `false` | Clear the selection before opening, so the same file can be picked twice. |
| `directory` | `boolean`                           | `false` | Select directories instead of files (`webkitdirectory`).                  |
| `input`     | `HTMLInputElement`                  | created | Adopt your own element instead of letting this create one.                |
| `onChange`  | `(files: FileList \| null) => void` | —       | Called with the new selection, or `null` when cleared.                    |
| `onCancel`  | `() => void`                        | —       | Called when the user dismisses the dialog.                                |

## Returns

| Property | Type                            | Notes                                                         |
| -------- | ------------------------------- | ------------------------------------------------------------- |
| `files`  | `FileList \| null`              | Getter. `null` before the first pick and after `reset()`.     |
| `input`  | `HTMLInputElement \| undefined` | Getter. The input driving the dialog; `undefined` during SSR. |
| `open`   | `(options?) => void`            | Open the dialog. Per-call options override the hook's.        |
| `reset`  | `() => void`                    | Clear the selection.                                          |

Both state properties are getters, so destructuring does not lose reactivity.

## Example

```ts
import { useFileDialog } from '@wynn-dev/svelte-use';

const { files, open } = useFileDialog({ accept: 'image/*', multiple: false });
```

```svelte
<button onclick={() => open()}>Pick an image</button>
{#if files?.length}<span>{files[0].name}</span>{/if}
```

### Per-call overrides

```ts
const { open } = useFileDialog({ accept: 'image/*' });

// A "Save as PDF" button overrides the hook's accept for this call only.
open({ accept: '.pdf' });
```

### Knowing when the user cancels

```ts
const { open } = useFileDialog({
	onChange: (files) => console.log(files?.length ?? 0),
	onCancel: () => console.log('dismissed')
});
```

### Bringing your own input

```svelte
<input bind:this={el} type="file" accept="image/*" />
```

```ts
const el = $state<HTMLInputElement>();
const { files } = $derived(useFileDialog({ input: el }));
```

## Notes

- **Resetting is two steps.** `reset()` clears the reactive `files` _and_ sets
  `input.value = ''`. The second half is the one people miss: without it,
  re-picking the same file fires no `change` event at all, because the input's
  value never changed. Setting `reset: true` does both before each `open()`.
- **A cancelled dialog keeps the old selection.** The native `cancel` event
  fires with no new files, so `files` is deliberately left alone.
- **The input is not in your markup.** That is the whole point — it exists so a
  styled button can drive the real picker. It is created inside an `$effect`,
  so it exists only while the component does, and both listeners are removed on
  unmount. Pass `input` if you want an element you own.
- `capture` is only assigned when you ask for it. Writing an empty string is not
  the same as leaving the attribute off, and browsers treat the attribute's
  presence as the signal.

## VueUse parity

| Behavior                                                  | Parity                                                                                                                                                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files`, `open`, `reset`                                  | Match. `open` takes the same partial-options override.                                                                                                                                       |
| `multiple` / `accept` / `capture` / `directory` / `reset` | Match.                                                                                                                                                                                       |
| `onChange` / `onCancel`                                   | Different mechanism, same events. VueUse returns `EventHookOn` subscriptions; this takes callbacks, because the input is not in your markup and there is no element to put `onchange` on.    |
| `input`                                                   | Match, minus reactivity: a plain element reference, not a ref or getter.                                                                                                                     |
| `initialFiles`                                            | **Dropped.** Seeding an input this util owns needs `DataTransfer`, and jsdom does not implement it, so the branch could not be tested. Keep your own files and pass them through `onChange`. |
| Handlers installed once                                   | VueUse re-assigns `onchange` from a `computed` on every read; this installs each listener once and removes it on unmount.                                                                    |
