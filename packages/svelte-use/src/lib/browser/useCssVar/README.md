# `useCssVar`

Read and write a CSS custom property on an element, in both directions.

> Ported from [`vueuse/core/useCssVar`](https://github.com/vueuse/vueuse/tree/main/packages/core/useCssVar).

## Signature

```ts
import { useCssVar } from '@wynn-dev/svelte-use';

const brand = useCssVar('--brand', () => document.documentElement, { initialValue: '#c41e3a' });

brand.value = '#3a41e3'; // sets --brand: #3a41e3
brand.value; // '#3a41e3', or whatever the stylesheet last resolved it to
```

## Options

| Option         | Type     | Default | Description                                              |
| -------------- | -------- | ------- | -------------------------------------------------------- |
| `initialValue` | `string` | —       | Value held until the element or the caller supplies one. |

| Parameter | Type                                            | Default                    | Description                                                 |
| --------- | ----------------------------------------------- | -------------------------- | ----------------------------------------------------------- |
| `prop`    | `MaybeGetter<string \| null \| undefined>`      | —                          | Custom property name. A getter is re-resolved on every run. |
| `target`  | `MaybeGetter<HTMLElement \| null \| undefined>` | `document.documentElement` | Element carrying the property.                              |

## Returns

| Field   | Type                  | Reactivity                                                     |
| ------- | --------------------- | -------------------------------------------------------------- |
| `value` | `string \| undefined` | Getter/setter-backed; assigning writes through to the element. |

## Examples

### Drive a theme token

```svelte
<script lang="ts">
	import { useCssVar } from '@wynn-dev/svelte-use';

	let hue = $state(210);
	const hueVar = useCssVar('--hue');

	$effect(() => {
		hueVar.value = String(hue);
	});
</script>

<input type="range" bind:value={hue} /><div style="background: hsl(var(--hue) 80% 50%)">…</div>
```

### Adopt a value a stylesheet already set

```ts
// No initialValue: the value is read back out of the element's computed style,
// so a token defined in CSS is picked up instead of being overwritten.
const surface = useCssVar('--surface');
```

## Edge cases & cleanup

- **The binding is a round trip.** Whenever the element or the property name
  changes, the current value is read back out of the computed style. A value set
  by a stylesheet, or by code that is not this util, wins over `initialValue`.
- **Changing the element or the name cleans up after itself.** The old
  declaration is removed from the node being abandoned, so the token is never
  stranded there.
- **Assigning `undefined` removes the property** rather than writing the string
  `"undefined"`.
- **Unmounting leaves the property in place.** Teardown would otherwise wipe a
  value the caller set themselves.
- No listeners or timers: nothing to release beyond the effects themselves.

## Parity notes

- **The `observe` option is not implemented.** VueUse wires it through
  `useMutationObserver`, which lands with feat-017; inlining a second observer
  here would duplicate that util for one option. Until then, a change made by a
  stylesheet or by unrelated code after mount is not picked up — assigning
  `value` still works. _ponytail: add `observe` in one line once
  `useMutationObserver` ships._
- **A non-nullish current value wins over `initialValue`,** matching VueUse's
  `read || variable || initialValue` chain. Note the consequence: because an
  empty computed value falls through to the current value, a variable that has
  been set can never be emptied by the element alone. Assign `undefined`
  explicitly to clear it.
- **The read effect reads the current value untracked**, mirroring VueUse, where
  that read happens inside a watch callback. Without `untrack` the read effect
  would also re-run on every write, which is both wasted work and a step closer
  to a reactive loop.
- **`initialValue` is the only option.** VueUse's `observe` is the sole other
  member of `UseCssVarOptions`.
