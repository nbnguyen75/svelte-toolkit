# `refAutoReset`

Reactive state that falls back to a default value after a quiet period. Inspired
by [VueUse `refAutoReset`](https://vueuse.org/shared/refAutoReset/).

Each write re-arms a timer; when the timer fires the value resets to the
default. Getter arguments are re-resolved on every write, so both the fallback
and the delay can track reactive state.

## Signature

```ts
import { refAutoReset } from '@wynn-dev/svelte-use';

const status = refAutoReset('idle', 2000);

status.value = 'saved!';
// ...after 2s of no writes:
status.value; // 'idle'
```

## Parameters

| Parameter      | Type                  | Default | Description                                          |
| -------------- | --------------------- | ------- | ---------------------------------------------------- |
| `defaultValue` | `MaybeGetter<T>`      | -       | Value restored after the quiet period.               |
| `afterMs`      | `MaybeGetter<number>` | `10000` | Quiet period in milliseconds before the reset fires. |

## Returns

| Field   | Type | Description                                                   |
| ------- | ---- | ------------------------------------------------------------- |
| `value` | `T`  | Current value. Writes re-arm the timer. Getter/setter-backed. |

## Notes

- The pending timer is cleared when the owning component unmounts.
- On the server no timer is armed (the `$effect` cleanup never runs there), so
  the value simply holds whatever was written.

## Example

```svelte
<script lang="ts">
	import { refAutoReset } from '@wynn-dev/svelte-use';

	const copied = refAutoReset(false, 1500);

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		copied.value = true;
	}
</script>

<button onclick={() => copy('hello')}>{copied.value ? 'Copied!' : 'Copy'}</button>
```
