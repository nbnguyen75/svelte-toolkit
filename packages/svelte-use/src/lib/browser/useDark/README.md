# `useDark`

Reactive dark-mode state synced to the DOM and persisted to storage.
Inspired by [VueUse `useDark`](https://vueuse.org/core/useDark/).

## Signature

```ts
import { useDark } from '@wynn-dev/svelte-use';

const dark = useDark();
dark.toggle();
dark.setMode('auto');
```

## Options

| Option       | Type     | Default                     | Description                                                                            |
| ------------ | -------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `storageKey` | `string` | `'svelte-use-color-scheme'` | Storage key for the persisted mode.                                                    |
| `attribute`  | `string` | `'class'`                   | `'class'` toggles the `dark` class; any other name sets `attribute="dark" \| "light"`. |
| `selector`   | `string` | `'html'`                    | Element receiving the dark-mode marker.                                                |

`UseDarkMode` is `'light' | 'dark' | 'auto'`.

## Returns

| Field     | Type                          | Reactive | Description                                                     |
| --------- | ----------------------------- | -------- | --------------------------------------------------------------- |
| `value`   | `boolean`                     | getter   | Effective dark state (stored mode, or OS preference in `auto`). |
| `toggle`  | `() => void`                  | method   | Flip between explicit `light` and `dark`.                       |
| `setMode` | `(mode: UseDarkMode) => void` | method   | Persist a mode, or return to OS-driven `auto`.                  |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useDark } from '@wynn-dev/svelte-use';

	const dark = useDark();
</script>

<button onclick={() => dark.toggle()}>
	{dark.value ? '☀️ Light' : '🌙 Dark'}
</button>
```

### SSR behavior

Renders `false` on the server without touching DOM or storage. On mount the
client hydrates from storage, then falls back to the OS
`prefers-color-scheme` preference, and syncs the marker element. Ensure the
server HTML does not hard-code a theme class to avoid hydration mismatch.

## Edge cases & cleanup

- OS preference changes are tracked live while the mode is `auto`; an
  explicit mode ignores them until `setMode('auto')`.
- `toggle()` resolves `auto` first: it writes the opposite of the _effective_
  value, so toggling from a dark OS preference lands on `light`, not `dark`.
- The media-query subscription and DOM sync dispose with the component.
- OS preference is read through Svelte's `MediaQuery` primitive
  (`svelte/reactivity`), one instance per `useDark()` call. Cleanup is shared,
  so repeated reads never rebind a listener. This requires `svelte` `^5.7.0`.
- A `selector` matching nothing is a safe no-op — the mode still resolves,
  only the marker is skipped.
- Must be called in component initialization (uses `$derived` / `$effect`).

## Parity notes

- Simplified versus VueUse: no custom-mode dictionary (see `useColorMode`,
  feat-022, for multi-theme support), and no `onChanged` hook. Storage
  defaults to `svelte-use-color-scheme` rather than VueUse's
  `vueuse-color-scheme`.
- VueUse returns a writable `Ref<boolean>` whose setter maps a value to the
  matching mode. This port exposes a read-only `value` plus explicit
  `toggle`/`setMode`, so a write can never silently resolve to `auto`.
