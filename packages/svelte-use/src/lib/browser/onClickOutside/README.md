# onClickOutside

Call a handler when a click lands outside an element — the close button for a
popover, a menu, a dropdown.

The target may be `null`, an element, or a getter. A `null` target is inert:
there is no inside, so there is nothing to be outside of.

## Usage

```svelte
<script lang="ts">
	import { onClickOutside } from '@wynn-dev/svelte-use';

	let popover: HTMLDivElement;
	const { cancel, stop } = onClickOutside(
		() => popover,
		() => (open = false)
	);
</script>

{#if open}
	<div bind:this={popover}>…</div>
{/if}
```

## How it decides

It listens on `window`, so a click anywhere in the document arrives, and treats
"outside" as _not inside the target's composed path_. Two things refine that:

- **`ignore`** — elements or CSS selectors that should count as inside. Clicks
  on a tooltip inside the popover shouldn't close it. Resolved per event, so a
  getter can keep the list current.
- **`capture`** (default `true`) — the click is caught on the way _down_, before
  any handler in your app can call `stopPropagation`. Turn it off if you would
  rather respect a stopped event.

A click with `detail === 0` was synthesised from the keyboard, so no
pointerdown preceded it and `ignore` is the only evidence available. Those are
re-checked per event rather than trusted from a pointerdown that never happened.

Only one click is handled per tick. A touch press also produces a compatibility
mouse click, and without this the handler would run twice.

## `cancel()`

Swallow the next outside click and carry on. For dismissing something without
also activating whatever is underneath it.

Unlike VueUse's version, `cancel()` survives the pointerdown that precedes the
click it was meant for — which is what makes it usable from a pointerdown
handler of your own, where the click is still on its way.

## Not ported

VueUse's options `controls`, `trigger`, and `detectIframe` are not here.
`stop()` covers detaching, `cancel()` covers swallowing, and iframe detection
was a workaround for Vue-only multi-root containers, which do not exist here.

VueUse also rewrites its own listeners on iOS < 13.4, where `stopPropagation`
does not apply outside a single document. That is not ported: it leaks the
listeners it replaces, and the underlying Safari bug is long fixed.

## Type

```ts
function onClickOutside(
	target: MaybeGetter<MaybeElement>,
	handler: (event: MouseEvent) => void,
	options?: OnClickOutsideOptions
): OnClickOutsideReturn;

interface OnClickOutsideOptions {
	ignore?: MaybeGetter<OnClickOutsideIgnored[]> | undefined;
	capture?: boolean | undefined;
}

type OnClickOutsideIgnored = MaybeElement | string;

interface OnClickOutsideReturn {
	stop: () => void;
	cancel: () => void;
}
```

## Caveats

- The handler runs on `click`, so it fires after `mouseup`. For a dismissal that
  feels immediate, listen on `pointerdown` yourself.
- A detached element is still an element. Clicks elsewhere are outside it, so
  null the target when you unmount rather than leaving a stale reference.
