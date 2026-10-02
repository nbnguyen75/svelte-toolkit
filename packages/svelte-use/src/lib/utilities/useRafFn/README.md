# `useRafFn`

Run a callback on every animation frame, with `resume` / `pause` controls and an
optional FPS cap.
Inspired by [VueUse `useRafFn`](https://vueuse.org/shared/useRafFn/).

## Signature

```ts
import { useRafFn } from '@wynn-dev/svelte-use';

useRafFn(({ delta }) => {
	x += delta * 0.06;
});
```

## Parameters

| Parameter | Type                                        | Default    | Description     |
| --------- | ------------------------------------------- | ---------- | --------------- |
| `fn`      | `(args: UseRafFnCallbackArguments) => void` | (required) | Frame callback. |
| `options` | `UseRafFnOptions`                           | `{}`       | See below.      |

| Option      | Type                          | Default | Description                                                                   |
| ----------- | ----------------------------- | ------- | ----------------------------------------------------------------------------- |
| `immediate` | `boolean`                     | `true`  | Start on mount.                                                               |
| `once`      | `boolean`                     | `false` | Stop after the first executed frame.                                          |
| `fpsLimit`  | `MaybeGetter<number \| null>` | `null`  | Cap frames per second; frames inside the budget are skipped. `null` disables. |

`UseRafFnCallbackArguments` is `{ delta: number; timestamp: DOMHighResTimeStamp }`.

## Returns

| Field      | Type         | Description                                              |
| ---------- | ------------ | -------------------------------------------------------- |
| `isActive` | `boolean`    | Whether the loop is running. Getter-backed.              |
| `pause`    | `() => void` | Cancel the pending frame. Safe when idle.                |
| `resume`   | `() => void` | Start or restart. No-op without `requestAnimationFrame`. |

## Examples

### Frame-rate-independent animation

```ts
let x = $state(0);

useRafFn(({ delta }) => {
	x += delta * 0.06;
});
```

### Render at most 30fps

```ts
useRafFn(render, { fpsLimit: 30 });
```

Frames are still _requested_ every vsync, but `fn` only runs when the frame is at
least `1000 / 30` ms after the last executed one — the skipped frames cost a
`requestAnimationFrame` call and nothing else.

### Run once on the next frame

```ts
useRafFn(() => measure(), { once: true });
```

## SSR behavior

Two guards hold with no DOM: `$effect` never runs during SSR, and `resume()`
checks `typeof requestAnimationFrame === 'function'`. So construction is safe and
`isActive` stays `false`, even if you call `resume()` during a server render.

## Edge cases & cleanup

- The pending frame is cancelled on unmount, so the callback cannot fire after teardown.
- The first executed frame reports `delta: 0` — it only establishes the baseline.
  Integrating from that first frame contributes nothing, which is the safe default.
- `pause()` called from inside the callback stops the loop: the loop re-checks the
  active flag before rescheduling, so no stray frame is queued.
- `fpsLimit` is resolved per frame from a getter, so it can change while running.
  Frames skipped by the cap are not counted in the next `delta`, so the delivered
  `delta` always spans real elapsed time.
- `fpsLimit: 0` or a getter returning `0` falls back to uncapped (the value is
  falsy, so no budget applies).

## Parity notes

- VueUse exposes `isActive`, `pause`, and `resume` on a `Pausable`. This port
  matches that surface; the returned `isActive` is a getter rather than a ref.
- `fpsLimit` semantics follow VueUse's `useRafFn`, including the skip-and-continue
  behaviour that keeps requesting frames rather than throttling by timer.
