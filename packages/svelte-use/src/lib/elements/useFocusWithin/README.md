# `useFocusWithin`

Track whether focus is inside an element, descendants included.

> Ported from [`vueuse/core/useFocusWithin`](https://github.com/vueuse/vueuse/tree/main/packages/core/useFocusWithin).

## Signature

```ts
import { useFocusWithin } from '@wynn-dev/svelte-use';

const { focused } = useFocusWithin(() => form);
```

Call it during component initialization — it uses `$effect` through
`useEventListener`, so a `bind:this` that resolves later is picked up.

## Parameters

| Parameter | Type                        | Description                           |
| --------- | --------------------------- | ------------------------------------- |
| `target`  | `MaybeGetter<MaybeElement>` | Element to watch, or a getter for it. |

No options: there is nothing here that would not be a knob nobody turns.

## Returns

| Field     | Type      | Reactivity                                                          |
| --------- | --------- | ------------------------------------------------------------------- |
| `focused` | `boolean` | Getter-backed `$state`; reading it in an effect or template tracks. |

## Examples

### Show a hint while the form has focus

```svelte
<script lang="ts">
	import { useFocusWithin } from '@wynn-dev/svelte-use';

	let form = $state<HTMLFormElement>();
	const { focused } = useFocusWithin(() => form);
</script>

<form bind:this={form}>
	<!-- True for every field, so a wrapper can react once. -->
	{#if focused}<p>still editing</p>{/if}
</form>
```

### Dismiss a popover when focus leaves

```svelte
<script lang="ts">
	import { useFocusWithin } from '@wynn-dev/svelte-use';

	let popover = $state<HTMLDivElement>();
	let open = $state(true);
	const { focused } = useFocusWithin(() => popover);

	$effect(() => {
		if (!open && !focused) close();
	});
</script>
```

## Edge cases & cleanup

- **Focus moving between children stays `true`.** `focusin` / `focusout` fire for each
  move, and the `focusout` handler sees the receiving element as `relatedTarget`, so the
  flag never dips.
- **Losing focus to the page chrome reports `false`.** Clicking the address bar produces no
  `relatedTarget`, which is treated as focus having left the subtree.
- **Shadow DOM boundaries are not traversed.** A `relatedTarget` retargeted to the host
  still passes `contains`, so the common case is right; focus moving genuinely into a
  shadow root's own subtree reports `false` on the outer element.
- Listeners are rebound when the target changes and removed on unmount. No timers.

## Parity notes

- **`relatedTarget`, not `:focus-within`.** VueUse re-checks `element.matches(':focus-within')`
  in its `focusout` handler. `focusout` is dispatched _before_ focus has actually moved, so
  the pseudo-class still describes the old focus and the check returns `true` — the flag is
  left stuck on, only to be corrected by whatever re-reads it. `contains(relatedTarget)`
  answers the question that was actually asked, and synchronously.
- **`focused` is read-only.** VueUse returns a writable computed whose setter re-focuses the
  element. That is `useFocus`'s job, and a setter here would mean "focus within" also being
  an imperative focus control.
- **No options.** VueUse accepts an options object with only `initialValue` — already
  covered by reporting `false` until focus arrives.
- **Not built on `useActiveElement`.** That would mean a second `document` listener and a
  global document comparison; `focusin` / `focusout` bubble, so one listener per element
  covers the whole subtree.
- **SSR-safe by construction.** No effect runs on the server, so `focused` is `false`.
