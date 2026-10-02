# `useToggle`

Boolean (or two-value) state with a toggler. Inspired by [VueUse `useToggle`](https://vueuse.org/shared/useToggle/).

## Signature

```ts
import { useToggle } from '@wynn-dev/svelte-use';

const { value, toggle } = useToggle();
```

## Parameters

| Parameter      | Type                             | Default | Description                                                            |
| -------------- | -------------------------------- | ------- | ---------------------------------------------------------------------- |
| `initialValue` | `MaybeGetter<boolean>`           | `false` | Starting value. Omitted means the falsy value.                         |
| `options`      | `UseToggleValues<Truthy, Falsy>` | —       | Required **only** for non-boolean state: `truthyValue` + `falsyValue`. |

| Option        | Type                  | Description                                         |
| ------------- | --------------------- | --------------------------------------------------- |
| `truthyValue` | `MaybeGetter<Truthy>` | The value `toggle()` moves to from the falsy side.  |
| `falsyValue`  | `MaybeGetter<Falsy>`  | The value `toggle()` moves to from the truthy side. |

Both values are required for custom state: with a non-boolean type, "toggle" is
only meaningful once both sides are named. Getter options are resolved once, at
construction.

## Returns

| Field    | Type                         | Description                                                      |
| -------- | ---------------------------- | ---------------------------------------------------------------- |
| `value`  | `boolean \| Truthy \| Falsy` | Current value. Getter/setter-backed, so `bind:` works.           |
| `toggle` | `(value?: T) => T`           | Flip both ways, or set an explicit value. Returns the new value. |

Passing an explicit `undefined` **sets** the value rather than flipping, matching
the argument arity. Comparison uses `Object.is`, so `NaN` and `-0` behave
correctly.

## Examples

### Boolean state

```svelte
<script lang="ts">
	import { useToggle } from '@wynn-dev/svelte-use';

	const notification = useToggle(true);
</script>

<button onclick={() => notification.toggle()}>
	{notification.value ? 'Hide' : 'Show'}
</button>

{#if notification.value}
	<p>Notifications are on</p>
{/if}
```

### Custom values

```svelte
<script lang="ts">
	import { useToggle } from '@wynn-dev/svelte-use';

	const theme = useToggle<'light' | 'dark', ''>('light', {
		truthyValue: 'dark',
		falsyValue: ''
	});
</script>

<button onclick={() => theme.toggle()}>{theme.value || 'light'}</button>
```

### Two-way binding

```svelte
<script lang="ts">
	import { useToggle } from '@wynn-dev/svelte-use';

	const open = useToggle();
</script>

<input type="checkbox" bind:checked={open.value} />
```

## SSR

Safe to construct on the server: there is no browser API, no timer, and no
`$effect`. The returned `value` / `toggle` work identically.
