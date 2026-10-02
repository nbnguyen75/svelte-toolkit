# `createSharedComposable`

Share one composable instance across every caller. Inspired by
[VueUse `createSharedComposable`](https://vueuse.org/shared/createSharedComposable/).

On the client the wrapped composable runs once and its result is reused. On the
server nothing is shared — each call builds a fresh instance — so one request
can never see another's state.

## Signature

```ts
import { createSharedComposable } from '@wynn-dev/svelte-use';

const useSharedCounter = createSharedComposable(() => ({ count: 0 }));

useSharedCounter().count; // one shared object
useSharedCounter().count; // ...the same object
```

## Parameters

| Parameter    | Type                   | Default | Description                                 |
| ------------ | ---------------------- | ------- | ------------------------------------------- |
| `composable` | `(...args: Args) => R` | -       | Factory invoked once; later calls reuse it. |

## Returns

| Type                   | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `(...args: Args) => R` | The shared instance on the client, a fresh one on the server. |

## Notes

- Arguments are forwarded to the **first** call only; later arguments are ignored
  because there is nothing left to pass them to.
- A composable returning `undefined` is still only invoked once — the cache is
  held in a wrapper object, not tested for truthiness.
- **No refcount.** Unlike Vue's `effectScope`, nothing is disposed when the last
  consumer unmounts. Use Svelte context when you need per-subtree sharing or
  teardown.

## Example

```svelte
<script lang="ts">
	import { createSharedComposable } from '@wynn-dev/svelte-use';
	import { useEventListener } from '@wynn-dev/svelte-use';

	// One window listener for the whole app, not one per component.
	const useWindowWidth = createSharedComposable(() => {
		let width = $state(window.innerWidth);
		useEventListener(window, 'resize', () => (width = window.innerWidth));
		return {
			get width() {
				return width;
			}
		};
	});

	const { width } = useWindowWidth();
</script>

<p>{width}px</p>
```

## SSR

Safe by construction: the server branch returns the composable untouched, so no
state is created ahead of the call and nothing is shared between requests.
