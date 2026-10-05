# useWindowFocus

Reactive window focus state, from `focus` and `blur`.

## Usage

```svelte
<script lang="ts">
	import { useWindowFocus } from '@wynn-dev/svelte-use';

	const { focused } = useWindowFocus();
</script>

<p>{focused ? 'Editing' : 'Away'}</p>
```

`focused` is a getter, so reading it in a template tracks it.

## Returns

| Field     | What it is                   |
| --------- | ---------------------------- |
| `focused` | Whether the window has focus |

## Notes

- Starts from `document.hasFocus()`, so a util created in a tab you switch to
  after mount still reports correctly on the next `focus`.
- Listeners are removed on unmount.
- VueUse takes a `{ window }` option; there is nothing to configure here, since
  the only window worth watching is the one the code is running in.
