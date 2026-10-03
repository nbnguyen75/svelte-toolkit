# `useTextDirection`

Reactive `dir` attribute of an element, writable back to the DOM.
Inspired by [VueUse `useTextDirection`](https://vueuse.org/core/useTextDirection/).

## Signature

```ts
import { useTextDirection } from '@wynn-dev/svelte-use';

const dir = useTextDirection({ observe: true });
dir.value = 'rtl';
```

## Options

| Option         | Type                    | Default  | Description                                                         |
| -------------- | ----------------------- | -------- | ------------------------------------------------------------------- |
| `initialValue` | `UseTextDirectionValue` | `'ltr'`  | Reported before hydration, and whenever the attribute is unusable.  |
| `observe`      | `boolean`               | `false`  | Watch `dir` with a `MutationObserver` and re-read external changes. |
| `selector`     | `string`                | `'html'` | Selector for the element carrying `dir`.                            |

## Returns

| Field   | Type                    | Reactive      | Description                                              |
| ------- | ----------------------- | ------------- | -------------------------------------------------------- |
| `value` | `UseTextDirectionValue` | getter/setter | Current direction. Assigning writes the `dir` attribute. |

`UseTextDirectionValue` is `'auto' | 'ltr' | 'rtl'`.

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useTextDirection } from '@wynn-dev/svelte-use';

	const dir = useTextDirection();
</script>

<p>direction: {dir.value}</p>
<button onclick={() => (dir.value = dir.value === 'rtl' ? 'ltr' : 'rtl')}>flip</button>
```

### Follow external changes

```svelte
<script lang="ts">
	import { useTextDirection } from '@wynn-dev/svelte-use';

	const dir = useTextDirection({ observe: true, selector: '#shell' });
</script>

<div id="shell">
	<p>direction: {dir.value}</p>
</div>
```

With `observe: true`, anything that sets `dir` — another util, a framework
helper, a browser extension — is picked up live.

## Edge cases & cleanup

- Reads the **`dir` attribute**, not the computed `direction`, matching VueUse.
  A stylesheet-only `direction: rtl` is therefore not reported. Set the
  attribute if you want to see it here.
- An unrecognised attribute value (`dir="sideways"`) falls back to
  `initialValue`. VueUse casts it blindly and leaks the raw string through.
- `auto` is preserved as a real value, not collapsed to `ltr`. Resolving what
  `auto` actually means is the browser's job, via computed `direction`.
- A `selector` matching nothing is a safe no-op: `value` stays `initialValue`,
  the setter updates local state only, and no observer is created.
- The `MutationObserver` is disconnected on unmount, and none is created when
  `observe` is off or the selector matches nothing.
- On the server `value` is `initialValue` and the setter writes local state
  only — no DOM access. VueUse additionally re-reads on mount; in Svelte the
  factory already runs on the client, so that pass would be redundant.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- No `store`/`storageKey` option. VueUse's `storageKey` only matters with
  `useStorage` integration, which is a different util.
- The write path sets the attribute directly instead of mirroring a writable ref
  into localStorage.
