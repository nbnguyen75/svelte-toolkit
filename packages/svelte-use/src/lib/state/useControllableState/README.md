# `useControllableState`

State that is either controlled by the caller or owned internally, with a
single getter/setter pair for both modes. Inspired by Base UI's
`useControlled`.

## Signature

```ts
import { useControllableState } from '@wynn-dev/svelte-use';

const open = useControllableState<boolean>({ defaultValue: false });
open.value = true;

console.log(open.value);
```

## Options

`MaybeGetter<T>` inputs accept a plain value or a `() => value` getter.

| Option         | Type                                       | Default     | Description                                                        |
| -------------- | ------------------------------------------ | ----------- | ------------------------------------------------------------------ |
| `defaultValue` | `T \| undefined \| (() => T \| undefined)` | `undefined` | Initial value when uncontrolled. Read once at setup.               |
| `value`        | `T \| undefined \| (() => T \| undefined)` | `undefined` | Controlled value. Non-`undefined` means the caller owns the state. |

## Returns

| Field   | Type             | Reactive      | Description                                                 |
| ------- | ---------------- | ------------- | ----------------------------------------------------------- |
| `value` | `T \| undefined` | getter+setter | Controlled value while controlled, else the internal state. |

## Examples

### Uncontrolled dialog

```svelte
<script lang="ts">
	import { useControllableState } from '@wynn-dev/svelte-use';

	const open = useControllableState<boolean>({ defaultValue: false });
</script>

<button onclick={() => (open.value = !open.value)}>
	{open.value ? 'close' : 'open'}
</button>
```

### Controlled input

```svelte
<script lang="ts">
	import { useControllableState } from '@wynn-dev/svelte-use';

	let { value: parentValue }: { value: string } = $props();
	// Reports the parent's value; assigning here is a no-op, so the parent
	// stays the only writer and there is exactly one source of truth.
	const field = useControllableState<string>({ value: () => parentValue });
</script>

<span>{field.value}</span>
```

### SSR behavior

Pure state — the server holds exactly what the browser holds, with no fallback
and nothing guarded. The mode lock and the internal `$state` both work without
a document.

## Edge cases & cleanup

- **The mode is locked at setup.** Whether `value` started non-`undefined`
  decides controlled vs. uncontrolled once, like Base UI's ref lock. A `value`
  arriving after an uncontrolled start does **not** take over, and a controlled
  `value` turning `undefined` later does not hand ownership back — flipping
  modes mid-life drops state silently, so it is a bug in the caller, not a
  transition.
- **Assigning while controlled is a no-op.** There is nowhere to store the
  write; the owner must pass the new value back through `value`.
- **`defaultValue` is read once.** A getter that changes later does not reset
  the state, matching `useState(default)`.
- **No timers, listeners, observers, or subscriptions.** There is nothing to
  stop and nothing leaks on unmount.
- Must be called in component initialization (uses `$state`).

## VueUse parity notes

- **No VueUse source.** This ports Base UI's `useControlled`, not a VueUse
  hook: Svelte has no controlled/uncontrolled primitive, and `useToggle` /
  `useCounter` / `useStorage` each re-invent this shape.
- **No `onChange`.** Base UI's setter is a silent no-op while controlled and
  carries no callback either; the owner already observes its own prop, so a
  callback here would be a second channel for the same event.
- **No dev-mode mode-flip warning.** Base UI warns when a component switches
  modes; here the lock is documented and pinned by a test instead of logged.
- **`defaultValue`, not `default`.** Base UI's option is `default`; `default`
  as an identifier is legal but reads badly next to `export default`, so this
  follows the package's own `initialValue` convention in spirit while naming
  what it is: the value used by default.
