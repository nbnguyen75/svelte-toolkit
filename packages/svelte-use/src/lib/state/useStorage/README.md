# `useStorage` (`useLocalStorage` / `useSessionStorage`)

Reactive `localStorage` / `sessionStorage`-backed state with cross-tab sync.
Inspired by [VueUse `useStorage`](https://vueuse.org/core/useStorage/).

## Signature

```ts
import { useLocalStorage, useSessionStorage, useStorage } from '@wynn-dev/svelte-use';

const name = useLocalStorage('name', 'anonymous');
name.value = 'ada';

const session = useSessionStorage('draft', { text: '' }, customSerializer);

// Any `Storage`-shaped backend:
const custom = useStorage('key', defaultValue, () => localStorage, serializer);
```

## Options

| Parameter      | Type                      | Default                      | Description                                             |
| -------------- | ------------------------- | ---------------------------- | ------------------------------------------------------- |
| `key`          | `string`                  | (required)                   | Storage key.                                            |
| `defaultValue` | `T`                       | (required)                   | Used when the key is absent, unreadable, or during SSR. |
| `serializer`   | `UseStorageSerializer<T>` | JSON with string passthrough | `{ write(value): string; read(raw): T }` codec.         |

`useStorage` additionally takes a `getStorage: () => Storage` accessor as its
third argument. `useLocalStorage` and `useSessionStorage` supply
`() => localStorage` and `() => sessionStorage` for you.

## Returns

| Field   | Type | Reactive        | Description                                      |
| ------- | ---- | --------------- | ------------------------------------------------ |
| `value` | `T`  | getter + setter | Current value; assigning persists write-through. |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useLocalStorage } from '@wynn-dev/svelte-use';

	const theme = useLocalStorage<'light' | 'dark'>('theme', 'light');
</script>

<button onclick={() => (theme.value = theme.value === 'light' ? 'dark' : 'light')}>
	Current: {theme.value}
</button>
```

### SSR behavior

Returns `defaultValue` on the server without reading or writing storage.
The client hydrates from storage on mount and persists write-through, so
prefer defaults that match the most common stored state to avoid
hydration flicker.

## Edge cases & cleanup

- Plain strings pass through unquoted; everything else is JSON-encoded.
  `read` failures (custom serializers) and storage failures (unavailable
  API, quota errors) fall back to the default instead of throwing — the
  same holds for an undecodable cross-tab payload, which leaves the current
  value untouched.
- **The default serializer validates shape, it does not assert types.** A
  JSON payload cannot be proven to be `T`, so the decoded value is checked
  against the runtime shape of `defaultValue` and rejected in favour of the
  default when they differ. This means `T` must be JSON-representable
  (primitives, arrays, plain objects) — a `Date` or class instance in
  `defaultValue` will not survive a reload. Pass a custom serializer for
  anything richer.
- The shape check is only as strong as the default: an **empty** array
  default (`[] as string[]`) constrains nothing about element types, so any
  stored array is accepted. Seed with a non-empty default when you want the
  element types verified.
- Cross-tab updates arrive via the `storage` event (same-key, non-null
  `newValue`); the listener disposes with the component.
- Writes happen in an `$effect`, so they flush after the assignment rather
  than synchronously.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- Covers VueUse's `useStorage` + `useLocalStorage` + `useSessionStorage`;
  async backends live in `useStorageAsync` (feat-015). No `mergeDefaults`
  or shallow/ref variants — plain `$state` cells only.
- VueUse takes a `Ref` for the key and defaults and returns a `Ref`; this
  port takes plain arguments and returns a getter/setter-backed object.
