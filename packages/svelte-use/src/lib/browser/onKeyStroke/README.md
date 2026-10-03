# `onKeyStroke` / `onKeyDown` / `onKeyPressed` / `onKeyUp`

Reactive keyboard listener with an optional key filter.
Inspired by [VueUse `onKeyStroke`](https://vueuse.org/shared/onKeyStroke/).

## Signature

```ts
import { onKeyStroke } from '@wynn-dev/svelte-use';

// Filtered
onKeyStroke('Escape', () => close());
onKeyStroke(['Control', 's'], () => save());
onKeyStroke(
	(event) => event.key === 'Tab',
	() => focusNext()
);

// Every keystroke
onKeyStroke((event) => console.log(event.key));
```

## Options

| Option      | Type                                 | Default     | Description                                                                     |
| ----------- | ------------------------------------ | ----------- | ------------------------------------------------------------------------------- |
| `eventName` | `'keydown' \| 'keypress' \| 'keyup'` | `'keydown'` | Which keyboard event to listen for.                                             |
| `target`    | `MaybeGetter<EventTarget \| null>`   | `window`    | Target to listen on. A getter is re-read, so the listener moves.                |
| `passive`   | `boolean`                            | `false`     | Register a passive listener. Leave off if the handler calls `preventDefault()`. |
| `dedupe`    | `MaybeGetter<boolean>`               | `false`     | Drop auto-repeat, so a held key fires once instead of at the repeat rate.       |

`onKeyDown`, `onKeyPressed`, and `onKeyUp` take the same options minus
`eventName`, which they fix.

## Returns

Nothing. The listener attaches in an `$effect` and detaches on unmount, so there
is no stop function to keep.

## Examples

### Close a dialog on Escape

```svelte
<script lang="ts">
	import { onKeyStroke } from '@wynn-dev/svelte-use';

	let dialog = $state<HTMLElement>();
	onKeyStroke('Escape', () => (open = false));
</script>
```

### Save on the platform shortcut

```svelte
<script lang="ts">
	import { onKeyStroke } from '@wynn-dev/svelte-use';

	// `metaKey` for macOS, `ctrlKey` elsewhere — a predicate is the whole answer.
	onKeyStroke(
		(event) => (event.metaKey || event.ctrlKey) && event.key === 's',
		(event) => {
			event.preventDefault();
			save();
		},
		// dedupe stops a held Cmd+S from saving on every repeat.
		{ dedupe: true }
	);
</script>
```

### Keyboard hint that appears when the user reaches for the keyboard

```svelte
<script lang="ts">
	import { onKeyStroke } from '@wynn-dev/svelte-use';

	let hint = $state(false);
	onKeyStroke(
		(event) => event.key.length === 1,
		() => (hint = true)
	);
</script>
```

## Edge cases & cleanup

- **The default target is `window`,** which is what a keyboard shortcut usually
  wants. Pass `target` to scope it to an element instead.
- **A `null` target attaches nothing.** A getter returning `null` mid-life moves
  the listener rather than dropping it.
- **The repeat check runs before the predicate,** so a deduped auto-repeat never
  reaches a predicate with a side effect.
- **`dedupe` is read on every event,** so a getter makes it switchable at runtime.
- **`dedupe` is off by default,** matching VueUse: a held key normally _should_
  repeat.
- **A non-keyboard event with a keyboard name is ignored,** so a synthetic
  `new Event('keydown')` cannot trigger a handler.
- **`passive` is off by default** because handlers routinely call
  `preventDefault()`.
- **`onKeyPressed` inherits `keypress` being deprecated:** it does not fire for
  non-printable keys. Prefer `onKeyDown`.
- Unmounting removes the listener; nothing keeps the target alive.

## Parity notes

- A `KeyPredicate` and a handler are both functions, so the overload is resolved
  by looking at the second argument — only the `(key, handler)` form has one.
- `target` accepts any `EventTarget` and is typed as such; VueUse restricts it to
  `EventTarget` as well, so no assertion is needed at the listener call.
- `value` is not a ref here — this util has none. See `useKeyModifier` for the
  reactive-pressed-state variant and `onStartTyping` for the page-level
  convenience wrapper.
