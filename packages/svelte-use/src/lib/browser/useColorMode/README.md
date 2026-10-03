# `useColorMode`

Reactive color mode with persistence and an `auto` value that follows the OS.

> Ported from [`vueuse/core/useColorMode`](https://github.com/vueuse/vueuse/tree/main/packages/core/useColorMode).

## Signature

```ts
import { useColorMode } from '@wynn-dev/svelte-use';

const mode = useColorMode();

mode.value = 'dark'; // persists and applies the dark class
mode.state; // 'dark'  — the mode in effect
mode.store; // 'dark'  — what was persisted
mode.system; // 'light' — what the OS prefers, regardless of the above
```

## Options

| Option              | Type                                                      | Default                                      | Description                                                                                       |
| ------------------- | --------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `selector`          | `string \| MaybeGetter<HTMLElement \| null \| undefined>` | `'html'`                                     | CSS selector, or an element, that receives the mode.                                              |
| `attribute`         | `string`                                                  | `'class'`                                    | `'class'` diffs the mode classes; any other name writes the whole mode as that attribute's value. |
| `initialValue`      | `T \| BasicColorSchema`                                   | `'auto'`                                     | Mode used until something is persisted.                                                           |
| `modes`             | `Partial<Record<T \| BasicColorSchema, string>>`          | `{ auto: '', light: 'light', dark: 'dark' }` | Mode-to-class overrides, merged over the defaults.                                                |
| `onChanged`         | `(mode, defaultHandler) => void`                          | —                                            | Intercept each change. Call `defaultHandler` to keep the default DOM write.                       |
| `storageRef`        | `ColorModeStore<T>`                                       | —                                            | Existing cell to persist through, instead of creating one.                                        |
| `storageKey`        | `string \| null`                                          | `'svelte-use-color-scheme'`                  | Storage key. `null` keeps the mode in memory only.                                                |
| `storage`           | `() => Storage`                                           | `() => localStorage`                         | Storage accessor.                                                                                 |
| `disableTransition` | `boolean`                                                 | `true`                                       | Suppress CSS transitions while the mode switches.                                                 |

## Returns

| Field    | Type                    | Reactivity                                                          |
| -------- | ----------------------- | ------------------------------------------------------------------- |
| `value`  | `T \| BasicColorMode`   | Getter/setter-backed; an alias for `state`, and assigning persists. |
| `store`  | `T \| BasicColorSchema` | Getter-backed; the persisted value, which may still be `'auto'`.    |
| `state`  | `T \| BasicColorMode`   | Getter-backed; `store` with `'auto'` resolved through `system`.     |
| `system` | `BasicColorMode`        | Getter-backed; the OS preference as a concrete mode.                |

## Examples

### Three-way switch

```svelte
<script lang="ts">
	import { useColorMode } from '@wynn-dev/svelte-use';

	const mode = useColorMode();
</script>

{#each ['light', 'dark', 'auto'] as const as option (option)}
	<button aria-pressed={mode.value === option} onclick={() => (mode.value = option)}>
		{option}
	</button>
{/each}
<p>following the OS: {mode.system}</p>
```

### A custom mode name

```ts
// <html class="night"> instead of <html class="dark">
const mode = useColorMode({ modes: { dark: 'night' } });
```

### An attribute instead of a class

```ts
// <html data-theme="dark">, leaving every class on <html> alone
const mode = useColorMode({ attribute: 'data-theme' });
```

## Edge cases & cleanup

- **Only the mode classes are touched.** With `attribute: 'class'` the write is
  a diff: classes named by `modes` are added or removed, and every other class
  on the element survives. Your app's own classes are not collateral.
- **An unmapped mode falls through to its raw name**, so an unknown mode simply
  applies no class rather than throwing.
- **An unchanged mode does not write.** When the diff would add and remove
  nothing, the DOM is left alone and the transition block is never injected —
  an unchanged mode cannot reflow the page.
- **The transition block is temporary.** It is appended, used to force one
  reflow, and removed in the same pass. Pass `disableTransition: false` to skip
  it entirely.
- **SSR writes nothing.** The DOM update lives in an `$effect`, so it only runs
  in the browser; `state` still resolves through `system` on the server.
- The OS query is released on unmount along with the effect that owns it.

## Parity notes

- **`emitAuto` is not implemented.** It is deprecated upstream, and `store`
  already exposes exactly what it was for: the raw persisted value, `'auto'`
  included.
- **`initialValue` cannot be a getter.** It seeds the storage layer, which needs
  a plain value to write on the first run.
- **The default storage key is `'svelte-use-color-scheme'`**, matching this
  package's `useDark`, not VueUse's `'vueuse-color-scheme'` — renaming it would
  orphan every preference already on a user's disk.
- **No `window` option and no `getSSRHandler` hook.** The write is already
  effect-guarded, and there is no server-side framework hook to hand it to.
- **`useDark` is built on this util.** It is the boolean view over the same
  machinery, so the two cannot disagree about what a mode means.
