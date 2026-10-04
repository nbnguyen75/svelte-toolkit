# useDropZone

Reactive file drop zone: which files were dropped on the target, and whether a
drag is over it right now. Dependency-free.

## Usage

```svelte
<script lang="ts">
	import { useDropZone } from '@wynn-dev/svelte-use';

	let el: HTMLDivElement;
	const zone = useDropZone(() => el, { dataTypes: ['image'] });
</script>

<div bind:this={el} class:over={zone.isOverDropZone}>
	{zone.files?.length ?? 0} image(s)
</div>
```

Passing a bare function is shorthand for `onDrop`:

```ts
const zone = useDropZone(
	() => el,
	(files) => upload(files ?? [])
);
```

## Returns

| Field            | What it is                                   |
| ---------------- | -------------------------------------------- |
| `files`          | Files from the last accepted drop, or `null` |
| `isOverDropZone` | Whether a drag is currently over the target  |

Both are getters, so reading one in a template tracks it.

`files` is `null` — not `[]` — until an accepted drop happens, and a drop that
carries no files (dragging selected text, say) leaves it `null`. That is the
difference between "nothing was dropped" and "something was dropped that had no
files in it"; both are `null` here, so check the callback if you care.

## Accepting only some files

`dataTypes` is a list of MIME-type substrings to allow:

```ts
useDropZone(() => el, { dataTypes: ['image', 'application/pdf'] });
```

Substring, not equality — `['image']` admits `image/png`. Every dropped item must
match, so one stray file rejects the whole drop.

It can also be a predicate, which receives the MIME types of the items:

```ts
useDropZone(() => el, { dataTypes: (types) => types.some((t) => t.startsWith('image/')) });
```

`dataTypes` is a **value or a predicate, not a getter** — a function here already
means "validate these types", so there is no way to tell a getter for the list
from the predicate. For rules that depend on reactive state, use `checkValidity`.

## `checkValidity`

Full control, for anything `dataTypes` cannot express. It receives the raw
`DataTransferItemList` and **takes precedence over both `dataTypes` and
`multiple`**:

```ts
useDropZone(() => el, {
	checkValidity: (items) => Array.from(items).every((item) => item.type === 'text/csv')
});
```

It is read on every drag event, so it may close over reactive state and the rules
can change between drags.

## `multiple`

`multiple: true` by default. Setting it to `false` makes the **default** validity
check reject any drop carrying more than one file — it does not quietly keep the
first. Silently dropping files is worse than refusing the drop. To truncate
instead, say so:

```ts
useDropZone(() => el, { multiple: false, checkValidity: () => true }); // keeps file 1
```

## `preventDefaultForUnhandled`

`false` by default. A drag the zone rejects is left unprevented, so the browser
keeps treating the drop as unhandled and shows its own "not allowed" cursor.

Set it to `true` to call `preventDefault()` on rejected drags too, which is what
you want when the zone is one of several drop targets and each should own its own
feedback:

```ts
useDropZone(() => el, { dataTypes: ['image'], preventDefaultForUnhandled: true });
```

## Caveats

- `onEnter`, `onOver`, and `onLeave` are called with `null` files, always. Only
  `onDrop` receives the files, because nothing is decided until the drop
  completes. VueUse does the same.
- `isOverDropZone` counts nested `dragenter`/`dragleave` pairs, because a drag
  crossing a child fires both on the way in and on the way out. An _unbalanced_
  `dragleave` cannot strand it on: the counter is clamped at zero, where VueUse
  decrements into the negatives and then never clears the flag again.
- `multiple` and `preventDefaultForUnhandled` are read once, at setup. Changing
  them later has no effect; `dataTypes` and `checkValidity` are read per event.
- Safari does not expose `files` during a drag, only `items`, so a `dataTypes`
  check would reject everything there. That case is detected by user agent and
  skipped, matching VueUse.
- Listeners are removed on unmount.

## Type

```ts
function useDropZone(
	target: MaybeGetter<HTMLElement | Document | null | undefined>,
	options: UseDropZoneOptions['onDrop']
): UseDropZoneReturn;
function useDropZone(
	target: MaybeGetter<HTMLElement | Document | null | undefined>,
	options?: UseDropZoneOptions
): UseDropZoneReturn;
```
