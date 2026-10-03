# `useStyleTag`

Inject a `<style>` element reactively, and remove it on unmount.

> Ported from [`vueuse/core/useStyleTag`](https://github.com/vueuse/vueuse/tree/main/packages/core/useStyleTag).

## Signature

```ts
import { useStyleTag } from '@wynn-dev/svelte-use';

const style = useStyleTag('body { color: red }');

const sheet = $state('a { color: blue }');
const reactive = useStyleTag(() => sheet.value, { id: 'my-sheet', media: 'print' });

// caller-driven lifetime
const manual = useStyleTag('a{}', { manual: true });
manual.load();
manual.unload();
```

## Options

| Option      | Type      | Default | Description                                                                |
| ----------- | --------- | ------- | -------------------------------------------------------------------------- |
| `id`        | `string`  | random  | Element id. An existing `<style>` with this id is adopted, not duplicated. |
| `media`     | `string`  | —       | `media` attribute, for print- or motion-scoped styles.                     |
| `nonce`     | `string`  | —       | CSP nonce.                                                                 |
| `immediate` | `boolean` | `true`  | Inject on mount.                                                           |
| `manual`    | `boolean` | `false` | Take over `load` / `unload`; nothing loads or is removed on unmount.       |

## Returns

| Field      | Type         | Reactivity                                                      |
| ---------- | ------------ | --------------------------------------------------------------- |
| `css`      | `string`     | Getter-backed for a getter source; assignable to write through. |
| `isLoaded` | `boolean`    | Getter-backed.                                                  |
| `id`       | `string`     | Fixed for the lifetime of the instance.                         |
| `load`     | `() => void` | Idempotent; a second call does nothing.                         |
| `unload`   | `() => void` | Removes the element; a later `load()` injects it again.         |

## Examples

### Static injection

```svelte
<script lang="ts">
	import { useStyleTag } from '@wynn-dev/svelte-use';

	useStyleTag('body { background: #101014 }');
</script>
```

### Theme that follows state

```svelte
<script lang="ts">
	import { useStyleTag } from '@wynn-dev/svelte-use';

	let accent = $state('#f5a524');
	const sheet = useStyleTag(() => `:root { --accent: ${accent} }`);
</script>

<input type="color" bind:value={accent} />
```

### Load it only when a dialog opens

```svelte
<script lang="ts">
	import { useStyleTag } from '@wynn-dev/svelte-use';

	let open = $state(false);
	const sheet = useStyleTag(() => `.dialog { display: ${open ? 'grid' : 'none'} }`, {
		manual: true
	});

	$effect(() => {
		if (open) sheet.load();
	});
</script>
```

## Edge cases & cleanup

- Automatic mode removes the element on unmount; `manual` mode leaves it in the
  document, because the caller owns the lifetime.
- `load()` is idempotent, so a late-arriving CSS value cannot inject a second
  element for the same id.
- Mirroring runs before the first load, so loading late lands the _current_ CSS
  rather than the value at initialization.
- No module-level counter or cache: the generated id comes from
  `crypto.randomUUID()`, keeping module scope free of mutable state.

## Parity notes

- **No cross-instance reference counting.** VueUse keeps a module-level `WeakMap`
  of id → element with a reference count, so two components sharing one `id`
  inject a single `<style>` and only remove it when the last one unmounts. The
  `WeakMap` is module-scope mutable state, which is out of bounds here, so an
  existing element carrying the id is adopted but there is no refcount: the
  first component to unmount takes the element with it. Give each instance its
  own id when several stylesheets are live at once.
- **`media` and `nonce` are not mirrored onto an adopted element.** They are
  applied when the element is created, matching VueUse, which only sets them on
  the element it appends.
- **Structural element check.** An element is only adopted when its tag really is
  `STYLE`, rather than duck-typing an optional DOM property.
