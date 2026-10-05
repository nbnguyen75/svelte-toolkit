# useFullscreen

Reactive Fullscreen API: whether the target is fullscreen, plus `enter`, `exit`
and `toggle`. Dependency-free.

## Usage

```svelte
<script lang="ts">
	import { useFullscreen } from '@wynn-dev/svelte-use';

	let el: HTMLDivElement;
	const { isFullscreen, toggle, isSupported } = useFullscreen(() => el);
</script>

<div bind:this={el}>{isFullscreen ? 'Fullscreen' : 'Windowed'}</div>

{#if isSupported}
	<button onclick={toggle}>Toggle</button>
{/if}
```

With no target it fullscreens `document.documentElement`.

## Returns

| Field          | What it is                                               |
| -------------- | -------------------------------------------------------- |
| `isSupported`  | Whether the element can enter fullscreen in this browser |
| `isFullscreen` | Whether the target is the element in fullscreen          |
| `enter`        | Requests fullscreen; resolves when the request settles   |
| `exit`         | Leaves fullscreen                                        |
| `toggle`       | `enter` when out, `exit` when in                         |

The two state fields are getters, so reading them in a template tracks them.

## `autoExit`

`false` by default. With `autoExit: true`, unmounting the owning component leaves
fullscreen:

```ts
const { isFullscreen } = useFullscreen(() => el, { autoExit: true });
```

Worth turning on for a "presentation mode" that opens a route: without it, a
fullscreen element from a component you navigated away from stays fullscreen and
the only way out is `Esc`.

## Caveats

- **`enter()` can reject.** Browsers require a user gesture, and refuse inside a
  cross-origin iframe without `allowfullscreen`. The returned promise carries the
  browser's `DOMException`, so `await enter()` inside a click handler is right and
  a floating `enter().catch(...)` is better than an unhandled rejection.
- **The flag follows the browser, not the call.** `enter()` sets it optimistically
  once the request resolves, then `fullscreenchange` keeps it honest — so pressing
  `Esc` clears it without you doing anything. A `fullscreenchange` naming a
  _different_ element is ignored: another component's fullscreen is not this
  flag's business.
- **Listeners are removed on unmount.**
- VueUse takes a `{ document }` option; there is nothing to configure here, since
  the only document worth fullscreening is the one the code is running in.

## Differences from VueUse

**Only the standard Fullscreen API is used** — no vendor prefixes. VueUse probes
twenty prefixed spellings (`webkitRequestFullScreen`, `mozCancelFullScreen`,
`msExitFullscreen`, `webkitEnterFullScreen`, and so on) across four name tables
before calling anything. Every browser that ever shipped one of those has shipped
the unprefixed version since roughly 2011, and TypeScript's DOM library only
types the unprefixed four, so the tables bought compatibility with browsers that
cannot run a modern Svelte app anyway. The one prefixed form still alive is
`webkitEnterFullscreen`, and it is video-only: it fullscreens a `<video>` element
on iPhone, where `requestFullscreen` does not exist. That is a native-controls
feature, not a drop-in, so use `<video controls>` and let the OS do it.

**`isSupported` asks whether the two methods exist.** VueUse also requires a
`fullscreenEnabled`-style flag. That flag is a _permission_ bit, not a capability
— an iframe without `allowfullscreen` reports `false` while both methods are
present and callable — so including it would report "unsupported" for a context
where `enter()` fails for a different and clearer reason.

**`isFullscreen` compares elements.** VueUse resolves a `fullscreenEnabled`-style
property name and reads _that_ as the state, which was correct when the resolved
name was `webkitIsFullScreen` ("is in fullscreen") but is not for the standard
`fullscreenEnabled` ("is fullscreen allowed"). On any current browser VueUse
therefore reports `isFullscreen: true` whenever the API is merely _available_, and
`exit()` then refuses to run because it is gated on that flag. This
implementation asks the question that means something: is the target
`document.fullscreenElement`?
