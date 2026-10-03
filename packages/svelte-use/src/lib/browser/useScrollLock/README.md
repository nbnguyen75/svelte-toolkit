# `useScrollLock`

Locks scrolling on an element, window, or document. Inspired by
[VueUse `useScrollLock`](https://vueuse.org/core/useScrollLock/).

## Signature

```ts
import { useScrollLock } from '@wynn-dev/svelte-use';

const scrollLock = useScrollLock(() => document.body);

scrollLock.locked = true; // page stops scrolling
scrollLock.locked = false;
```

## Options

`useScrollLock(element, initialState?)` takes positional arguments rather than an
options bag, because the target is required.

| Argument       | Type                                                                   | Default | Description                                                  |
| -------------- | ---------------------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| `element`      | `MaybeGetter<HTMLElement \| SVGElement \| Window \| Document \| null>` | —       | Target to lock, or a getter re-resolved on every effect run. |
| `initialState` | `boolean`                                                              | `false` | Whether to start locked.                                     |

## Returns

| Field    | Type      | Reactive | Description                                               |
| -------- | --------- | -------- | --------------------------------------------------------- |
| `locked` | `boolean` | get/set  | Whether the target is locked. Writable, so `bind:` works. |

Assigning `true` locks, assigning `false` unlocks.

## Examples

### Modal that blocks the page

```svelte
<script lang="ts">
	import { useScrollLock } from '@wynn-dev/svelte-use';

	let { open }: { open: boolean } = $props();
	const scrollLock = useScrollLock(() => document.body);

	$effect(() => {
		scrollLock.locked = open;
	});
</script>

{#if open}<dialog open>modal</dialog>{/if}
```

### Lock one scrollable panel

```svelte
<script lang="ts">
	import { useScrollLock } from '@wynn-dev/svelte-use';

	let panel = $state<HTMLElement>();
	const scrollLock = useScrollLock(() => panel);
</script>

<section bind:this={panel}>frozen list</section>
<button onclick={() => (scrollLock.locked = true)}>freeze</button>
```

### Start locked

```ts
const scrollLock = useScrollLock(() => document.body, true);
```

## Edge cases & cleanup

- **A `window` or `document` target resolves to `documentElement`,** because that
  is where the scrollbar and the overflow cascade live. Pass `document.body`
  explicitly to target the body.
- **The previous inline `overflow` is captured per lock and restored per unlock.**
  An element that already had `overflow: auto` — or an author who set
  `hidden` themselves — comes back exactly as it was. VueUse clears an author's
  own `hidden` here; this port does not.
- **Locking twice does not overwrite the captured baseline**, so a redundant
  `locked = true` cannot lose the original value. A second lock _cycle_ captures
  fresh.
- **Unlocking with no lock is a no-op**, so a dismiss handler can call it
  unconditionally.
- **Unmounting unlocks.** A dismissed modal cannot leave the page unscrollable.
- **A swapped element is followed.** If the target changes while locked, the old
  element is restored and the new one hidden, rather than leaving the old one
  stranded at `overflow: hidden`.
- **iOS gets a `touchmove` guard.** iOS treats `overflow: hidden` on the page as a
  suggestion, so the touch has to be blocked at the event. The listener is
  attached per lock, not for the component's lifetime, because a non-passive
  listener costs scroll performance on every platform.
- **The guard still lets a scrollable area scroll.** A `touchmove` whose target is
  inside an `overflow: scroll` / `auto` element (an actually-scrolling modal
  body) is not prevented, and neither is a multi-touch pinch.
- **A nullish target locks nothing** and reports `locked === false`, so a
  `bind:this` that has not landed yet is not an error.

## Parity notes

- VueUse's module-scope `WeakMap` of initial overflows is dropped. Keeping lock
  bookkeeping in per-call variables is what makes the SSR path safe: a
  module-scope cache is shared across requests on a server.
- The unmount teardown restores from those plain variables rather than going
  through the `locked` flag. A `$state` read inside an unmount teardown sees the
  component's pre-destroy value, so a `if (!locked) return` guard there would
  skip the restore of a lock that is still in effect.
- `locked` is a writable getter rather than a writable computed, so it works with
  `bind:` and reports the same value in both directions.
- The `checkOverflowScroll` ancestor walk is kept, but it stops at `<body>` and
  reads only computed style — matching VueUse's behaviour without its
  `parentNode` cast.
