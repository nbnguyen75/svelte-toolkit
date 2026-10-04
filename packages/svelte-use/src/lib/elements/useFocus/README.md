# `useFocus`

Track or set the focus state of an element.

> Ported from [`vueuse/core/useFocus`](https://github.com/vueuse/vueuse/tree/main/packages/core/useFocus).

## Signature

```ts
import { useFocus } from '@wynn-dev/svelte-use';

const { focused } = useFocus(() => input, { focusVisible: true });

focused = true; // calls input.focus()
```

Call it during component initialization — it uses `$effect` through
`useEventListener`, so a `bind:this` that resolves later is picked up.

## Parameters

| Parameter | Type                        | Description                                    |
| --------- | --------------------------- | ---------------------------------------------- |
| `target`  | `MaybeGetter<MaybeElement>` | Element to focus or watch, or a getter for it. |
| `options` | `UseFocusOptions`           | See below.                                     |

### Options

| Option          | Type      | Default | Description                                                              |
| --------------- | --------- | ------- | ------------------------------------------------------------------------ |
| `initialValue`  | `boolean` | `false` | Focus the element as soon as it exists, and again if the target changes. |
| `focusVisible`  | `boolean` | `false` | Report focus only when the browser treats it as keyboard-visible.        |
| `preventScroll` | `boolean` | `false` | Skip scrolling the element into view when focusing.                      |

## Returns

| Field     | Type                                    | Reactivity                                                             |
| --------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `focused` | `boolean` (readable **and** assignable) | Getter-backed `$state`; reading it tracks, assigning focuses or blurs. |

> **Assign through the object, not a destructured binding.** `const { focused } = useFocus(el)`
> leaves `focused` readable and reactive, but JavaScript copies a getter's value when
> destructuring, so no setter is left to assign through. Keep the returned object when you
> need `focused = true`.

## Examples

### Focus an input on mount

```svelte
<script lang="ts">
	import { useFocus } from '@wynn-dev/svelte-use';

	let email = $state<HTMLInputElement>();
	useFocus(() => email, { initialValue: true });
</script>

<input bind:this={email} type="email" />
```

### Focus only for keyboard users

```svelte
<script lang="ts">
	import { useFocus } from '@wynn-dev/svelte-use';

	let button = $state<HTMLButtonElement>();
	// Clicking the button leaves focused false, so styling keyed on it cannot
	// make a sticky ring after a mouse click.
	const { focused } = useFocus(() => button, { focusVisible: true });
</script>

<button bind:this={button} class:ring={focused}>save</button>
```

### Dismiss on Escape

```svelte
<script lang="ts">
	import { useEventListener, useFocus } from '@wynn-dev/svelte-use';

	let dialog = $state<HTMLElement>();
	const { focused } = useFocus(() => dialog);
	useEventListener(
		() => (focused ? window : null),
		'keydown',
		(e) => {
			if (e.key === 'Escape') close();
		}
	);
</script>
```

## Edge cases & cleanup

- **`focusVisible` uses `matches(':focus-visible')`**, and only when the option is on —
  that call forces a style recalculation, so the default path never pays for it. jsdom has
  no selector support for the pseudo-class, so tests stub `matches`.
- **Assigning is idempotent.** `focused = true` on an already-focused element does not call
  `focus()` again, which would otherwise reset a selection and restart an animation.
- **`initialValue` re-fires when the target changes.** If the target is replaced while the
  element is focused, focus follows it — that is the point of the option.
- Listeners are rebound when the target changes and removed on unmount. No timers.

## Parity notes

- **A getter/setter pair, not a writable ref.** VueUse returns a `WritableComputedRef`, so
  every read and write goes through `.value`. Here `focused` is a plain reactive property
  that is both read and assigned, which is the package convention and survives
  destructuring. VueUse's ref has the same destructuring limit — `const { value } = ref()`
  is a copy — so nothing is lost here.
- **One return field.** VueUse also returns `focus()` and `blur()`. They are the two
  assignments `focused = true` and `focused = false` already cover, so a second way to say
  the same thing would only be a redundant path.
- **No overload that takes a `Ref` for the element**, only `MaybeGetter`, which is
  structurally what a `bind:this` state produces. No `useTemplateRef` param either: a
  `TemplateRef` is not an element until it is set, so `() => ref.current` is the getter.
- **No `controls`-style pause.** The listeners are owned by the target's effect; there is
  nothing to pause.
- **SSR-safe by construction.** No effect runs on the server, so `focused` is `false` and
  assignments are inert.
