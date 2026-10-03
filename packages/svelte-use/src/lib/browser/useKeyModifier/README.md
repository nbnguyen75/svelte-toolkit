# `useKeyModifier`

Reactive pressed state for a single modifier key.
Inspired by [VueUse `useKeyModifier`](https://vueuse.org/core/useKeyModifier/).

## Signature

```ts
import { useKeyModifier } from '@wynn-dev/svelte-use';

const shift = useKeyModifier('Shift');

console.log(shift.value); // true while held, false while not, null before any event
```

## Options

| Option     | Type                            | Default                                        | Description                             |
| ---------- | ------------------------------- | ---------------------------------------------- | --------------------------------------- |
| `events`   | `readonly string[]`             | `['mousedown', 'mouseup', 'keydown', 'keyup']` | Events that re-read the modifier state. |
| `initial`  | `boolean \| null`               | `null`                                         | Reported before the first event.        |
| `document` | `MaybeGetter<Document \| null>` | `document`                                     | Document to listen on.                  |

`modifier` is one of `Alt`, `AltGraph`, `CapsLock`, `Control`, `Fn`, `FnLock`,
`Meta`, `NumLock`, `ScrollLock`, `Shift`, `Symbol`, `SymbolLock`.

## Returns

| Field   | Type              | Reactive | Description                                                    |
| ------- | ----------------- | -------- | -------------------------------------------------------------- |
| `value` | `boolean \| null` | getter   | `true` while held, `false` while not, `null` before any event. |

## Examples

### Caps-lock-aware uppercase toggle

```svelte
<script lang="ts">
	import { useKeyModifier } from '@wynn-dev/svelte-use';

	const shift = useKeyModifier('Shift');
	let typing = $state('');
</script>

<input bind:value={typing} />
<p class:upper={shift.value === true}>{shift.value ? typing.toUpperCase() : typing}</p>
```

### Shift-click to extend a selection

```svelte
<script lang="ts">
	import { useKeyModifier } from '@wynn-dev/svelte-use';

	const shift = useKeyModifier('Shift');

	function onRowClick(event: MouseEvent, id: string) {
		if (shift.value) extendSelection(id);
		else select(id);
	}
</script>
```

### Track a modifier only while the mouse is involved

```svelte
<script lang="ts">
	import { useKeyModifier } from '@wynn-dev/svelte-use';

	// No `keydown` / `keyup` here, so the state only moves on a mouse press.
	const shift = useKeyModifier('Shift', { events: ['mousedown', 'mouseup'] });
</script>
```

## Edge cases & cleanup

- **`null` is the honest default.** Nothing has reported the modifier yet, and
  `false` would claim the user is definitely not holding it. Compare with
  `=== true` if you need to branch.
- **`initial` overrides that,** which is what you want for a value that has a
  known starting point.
- **`getModifierState` is the single source of truth,** so the state is correct
  no matter which event revealed it — including a modifier held before the first
  event, which shows up on the next keystroke.
- **An event without `getModifierState` leaves the state alone,** rather than
  clobbering it with a bad read.
- **One listener is registered per entry in `events`,** and all of them are
  removed on unmount.
- **`events` is read once per call,** not per event, so it is not a getter.
- **A `null` document attaches nothing** and leaves the value at its initial
  reading.
- The modifier names jsdom does not model (`CapsLock`, `Fn`, …) are passed
  through to `getModifierState` rather than being special-cased.
- Unmounting removes every listener.

## Parity notes

- VueUse reads the modifier flags off the event object; this reads
  `getModifierState`, which is the DOM's own accessor for exactly this question
  and covers mouse events and modifier names uniformly.
- `value` is a getter-backed object rather than a ref, so destructuring keeps
  reactivity.
