# `useMagicKeys`

Reactive pressed state for every key, including `ctrl+shift+p`-style
combinations.
Inspired by [VueUse `useMagicKeys`](https://vueuse.org/core/useMagicKeys/).

## Signature

```ts
import { useMagicKeys } from '@wynn-dev/svelte-use';

const magic = useMagicKeys();

console.log(magic.ctrl_k); // true while Ctrl and K are both held
console.log(magic.current); // Set(['control', 'k'])
```

Any property name works: an unknown key reads `false` rather than throwing, so
`magic.meta_shift` is valid before anything is pressed.

## Options

| Option         | Type                                        | Default   | Description                                                                          |
| -------------- | ------------------------------------------- | --------- | ------------------------------------------------------------------------------------ |
| `target`       | `MaybeGetter<EventTarget \| null>`          | `window`  | Target to listen on.                                                                 |
| `aliasMap`     | `Readonly<Record<string, string>>`          | see below | Shorthand names, merged **over** the defaults so a partial map keeps them.           |
| `passive`      | `boolean`                                   | `true`    | Register passive listeners. Pass `false` if `onEventFired` calls `preventDefault()`. |
| `onEventFired` | `(event: KeyboardEvent) => void \| boolean` | —         | Called for every keydown and keyup, after the state is updated.                      |

Default `aliasMap`, exported as `DEFAULT_MAGIC_KEYS_ALIAS_MAP`:

| Aliases                       | Reads                                             |
| ----------------------------- | ------------------------------------------------- |
| `ctrl`                        | `control`                                         |
| `command`, `cmd`              | `meta`                                            |
| `option`                      | `alt`                                             |
| `up`, `down`, `left`, `right` | `arrowup`, `arrowdown`, `arrowleft`, `arrowright` |

## Returns

| Field       | Type                  | Reactive | Description                                                   |
| ----------- | --------------------- | -------- | ------------------------------------------------------------- |
| _(any key)_ | `boolean`             | proxy    | `true` while the key, or every key in a combination, is held. |
| `current`   | `ReadonlySet<string>` | getter   | Raw keys currently held.                                      |

## Examples

### Bind a shortcut to an action

```svelte
<script lang="ts">
	import { useMagicKeys } from '@wynn-dev/svelte-use';

	const magic = useMagicKeys();

	$effect(() => {
		if (magic.ctrl_s) save();
	});
</script>

{#if magic.ctrl_k}<span>⌘K / Ctrl+K</span>{/if}
```

### Arrow-key navigation

```svelte
<script lang="ts">
	import { useMagicKeys } from '@wynn-dev/svelte-use';

	const magic = useMagicKeys();
	let index = $state(0);

	$effect(() => {
		if (magic.up) index -= 1;
		if (magic.down) index += 1;
	});
</script>
```

### Keep platform shortcuts in one place

```svelte
<script lang="ts">
	import { useMagicKeys } from '@wynn-dev/svelte-use';

	const magic = useMagicKeys({ aliasMap: { mod: 'meta' } });

	// Read the modifier the user actually pressed.
	const save = $derived(magic.meta ? magic.meta_s : magic.ctrl_s);
</script>
```

## Edge cases & cleanup

- **A combination is `true` only while every key is held,** and `+`, `-`, and `_`
  all separate parts, so `ctrl+k`, `ctrl-k`, and `ctrl_k` are the same thing.
- **Aliases resolve inside a combination,** so `cmd_k` and `meta_k` read the same
  state.
- **A combination with an empty part is `false`.** `every` on an empty list is
  `true`, which would be a permanently-true state; that is guarded explicitly.
- **Releasing Shift or Alt releases what was pressed with it,** in press order.
  Browsers do not report "Shift is up" as its own event, so a key pressed with
  Shift would otherwise stay stuck.
- **Releasing Meta releases what was held with it,** because macOS never fires
  `keyup` for those keys (VueUse #1312).
- **Keys pressed _before_ the modifier are unaffected.** Only what was held
  _during_ the modifier is booked against it.
- **Window blur and focus release everything,** since no `keyup` ever arrives for
  what the user was holding and the modifiers genuinely are up.
- **`current` holds raw keys,** so `['control', 'k']` — no aliases, no
  combination strings.
- **`onEventFired` is called after the state is updated,** so it can read the
  state it just changed. Its return value is ignored.
- **Listeners are `passive` by default,** since key state rarely needs
  `preventDefault()`. Pass `passive: false` when it does.
- **State is built on `SvelteMap` / `SvelteSet`,** which is what makes a
  combination observable _before_ any key has been pressed. A `$state` object
  subscribes to nothing for a property that has never been set, so
  `magic.ctrl_k` would never re-run on the first shortcut.
- Unmounting removes the keydown, keyup, blur, and focus listeners.

## Parity notes

- **No `reset()` is exposed.** VueUse's is internal, called only on window blur
  and focus, which this port does too.
- **A named member cannot coexist with the index signature** in TypeScript, which
  is a second reason not to add one.
- **`code` is not tracked.** VueUse keys state on `event.key` only, so
  `magic.digit1` is not a thing; use `magic['1']`.
- **The reactive object is a plain `Proxy`,** not a `reactive()` wrapper, so
  there is no Proxy-over-Proxy and no per-key lazy source. Reads are coarse
  (any key change re-runs a reader) — which is the right trade for keyboard
  state, where events are rare and a stuck shortcut is worse than a wasted
  render.
- **`aliasMap` is a per-call copy,** so two calls with different maps cannot
  interfere.
