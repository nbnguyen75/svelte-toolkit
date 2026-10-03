# `onStartTyping`

Fires when the user starts typing on a non-editable part of the page.
Inspired by [VueUse `onStartTyping`](https://vueuse.org/shared/onStartTyping/).

## Signature

```ts
import { onStartTyping } from '@wynn-dev/svelte-use';

let hintVisible = $state(false);
onStartTyping(() => (hintVisible = true));
```

## Options

| Option                     | Type                                | Default    | Description                                                 |
| -------------------------- | ----------------------------------- | ---------- | ----------------------------------------------------------- |
| `document`                 | `MaybeGetter<Document \| null>`     | `document` | Document to listen on.                                      |
| `isTypedCharValid`         | `(event: KeyboardEvent) => boolean` | see below  | Decides whether a keystroke counts as typing.               |
| `isFocusedElementEditable` | `() => boolean`                     | see below  | Decides whether the focused element swallows the keystroke. |

## Returns

Nothing. The listener attaches in an `$effect` and detaches on unmount.

## Exported predicates

Both defaults are exported so you can wrap rather than replace them.

| Function                   | Signature                           | Returns `true` when                                             |
| -------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `isTypedCharValid`         | `(event: KeyboardEvent) => boolean` | The key is one printable character and no modifier is held.     |
| `isFocusedElementEditable` | `() => boolean`                     | Focus is in an `<input>`, `<textarea>`, or a `contenteditable`. |

## Examples

### Reveal a shortcut hint on first keystroke

```svelte
<script lang="ts">
	import { onStartTyping } from '@wynn-dev/svelte-use';

	let showHint = $state(false);
	onStartTyping(() => (showHint = true));
</script>

{#if showHint}<p>Press <kbd>?</kbd> for shortcuts</p>{/if}
```

### Treat any keystroke, including shortcuts, as "reaching for the keyboard"

```svelte
<script lang="ts">
	import { onStartTyping } from '@wynn-dev/svelte-use';

	let showHelp = $state(false);
	onStartTyping(() => (showHelp = true), {
		isTypedCharValid: () => true
	});
</script>
```

### Count keystrokes aimed at a custom editor

```svelte
<script lang="ts">
	import { onStartTyping } from '@wynn-dev/svelte-use';

	let editorMounted = $state(false);
	onStartTyping(() => (editorMounted = true), {
		isFocusedElementEditable: () => editorMounted
	});
</script>
```

## Edge cases & cleanup

- **Any modifier rejects the keystroke.** Ctrl/⌘/Alt combinations are shortcuts,
  even when they produce a printable character (⌘K, Alt+1 on a Mac layout).
  `shift` does not — a capital letter is still typing.
- **Typing into a field does not count.** `<input>`, `<textarea>`, and anything
  with a `contenteditable` attribute swallow the keystroke, so a user typing into
  a form does not trigger a page-level hint.
- **`contenteditable="false"` counts as editable.** The attribute is present, and
  treating its absence as the signal is the more conservative reading.
- **Focus on `<body>` or nothing is not editable,** so the page itself counts.
- **`isTypedCharValid` is a pure function and runs during SSR** if called
  directly; only the listener needs a browser.
- **A `null` document attaches nothing.**
- Unmounting removes the listener.

## Parity notes

- **`isTypedCharValid` does not use the deprecated `keyCode`.** VueUse compares
  `keyCode` against the `0-9` / `A-Z` ranges, which misses punctuation entirely
  and reports layout-dependent results. A key of exactly one character is a
  printable character on every layout, and it covers digits and letters too.
- **`document` accepts a getter**, which VueUse types as a plain `Document`; the
  rest of this package uses getters for anything DOM-adjacent so a target can be
  resolved after mount.
- The listener is `passive`, since it never needs `preventDefault()`.
