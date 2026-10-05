# usePageLeave

Reactive state for whether the pointer has left the page.

## Usage

```svelte
<script lang="ts">
	import { usePageLeave } from '@wynn-dev/svelte-use';

	const { isLeft } = usePageLeave();
</script>

<p>{isLeft ? 'Come back' : 'Here'}</p>
```

`isLeft` is a getter, so reading it in a template tracks it.

## Returns

| Field    | What it is                            |
| -------- | ------------------------------------- |
| `isLeft` | Whether the pointer has left the page |

## Notes

- Listeners are removed on unmount.
- VueUse takes a `{ window }` option; there is nothing to configure here, since
  the only page worth watching is the one the code is running in.

## Difference from VueUse

**Entering and leaving are separate listeners here.** VueUse points all three of
its listeners at one handler that sets `isLeft = !event.relatedTarget`, so
re-entering the page fires `mouseenter` with a nullish `relatedTarget` and flips
`isLeft` back to `true` — the pointer just arrived, but the flag says it left. It
corrects itself on the next move between elements, which is not much of a
guarantee for a flag meant to guard a "are you still there?" prompt.

This implementation gives `mouseenter` its own handler, so `isLeft` means what its
name says. The `mouseout` listener on `window` is kept: it is redundant with
`mouseleave` on `document` in current engines, and it is what reports a `mouseout`
whose `relatedTarget` is null, which is the actual "the pointer is no longer over
the page" signal.
