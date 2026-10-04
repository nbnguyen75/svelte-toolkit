# useBase64

Reactive base64 encoding for strings, blobs, binary buffers, canvases, images, and
plain JavaScript objects.

## Signature

```ts
function useBase64(
	target: MaybeGetter<Base64Target | null | undefined>,
	options?: UseBase64Options
): UseBase64Return;
```

VueUse declares eight overloads for the same hook. A single signature covers
every documented input here, because the return type does not change.

## Parameters

| Name      | Type                                             | Default | Notes                                                                                                |
| --------- | ------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------- |
| `target`  | `MaybeGetter<Base64Target \| null \| undefined>` | —       | A value or a getter. The getter is re-read on change, so a reactive source re-encodes automatically. |
| `options` | `UseBase64Options`                               | `{}`    | Serialization and output options.                                                                    |

### `UseBase64Options`

| Option       | Type                        | Default          | Applies to    | Notes                                                                        |
| ------------ | --------------------------- | ---------------- | ------------- | ---------------------------------------------------------------------------- |
| `dataUrl`    | `boolean`                   | `true`           | all           | `false` strips the `data:...;base64,` prefix.                                |
| `type`       | `string`                    | browser's        | canvas, image | Passed to `toDataURL`. `undefined` lets the browser pick (`image/png`).      |
| `quality`    | `number`                    | browser's        | canvas, image | Passed to `toDataURL`. `undefined` lets the browser pick (`0.92` in Chrome). |
| `serializer` | `(value: object) => string` | `JSON.stringify` | objects only  | Returned string is encoded as `application/json`.                            |

`type` and `quality` are forwarded exactly as given and carry no defaults here,
matching VueUse — the browser decides.

`dataUrl: false` on an `ArrayBuffer` changes nothing: binary input is already
raw base64 and never had a prefix.

### `Base64Target`

`string` | `Blob` | `ArrayBuffer` | `HTMLCanvasElement` | `HTMLImageElement` | `object`

`File` is a `Blob`, and any other object is serialized. Serialization matches
VueUse: a `Map` becomes a JSON object, a `Set` becomes a JSON array, everything
else uses `JSON.stringify`.

## Returns

| Property  | Type                           | Notes                                                                    |
| --------- | ------------------------------ | ------------------------------------------------------------------------ |
| `base64`  | `string`                       | Getter. `''` until the first result, and on the server.                  |
| `promise` | `Promise<string> \| undefined` | Getter. In-flight encoding of the latest run; `undefined` on the server. |
| `execute` | `() => Promise<string>`        | Re-encode on demand and return the result.                               |

Both state properties are getters, so destructuring does not lose reactivity.

## Example

```ts
import { useBase64 } from '@wynn-dev/svelte-use';

const source = $state<number[]>([1, 2, 3]);
const { base64, promise, execute } = useBase64(() => source);

// Re-encodes on its own whenever `source` changes.
// await promise;
console.log(base64); // 'data:application/json;base64,WzEsMiwzXQ=='

source = [1, 2, 3, 4];
await tick();
// base64 updated

// Or force it, and get the value back:
await execute();
```

### Raw payload without the prefix

```ts
const { base64 } = useBase64(new Uint8Array([104, 105]).buffer);
// base64 === 'aGk='
```

### Custom serializer

```ts
const { base64 } = useBase64([1, 2, 3], {
	dataUrl: false,
	serializer: (value) => JSON.stringify(value, null, 2)
});
```

The serializer is ignored for `string`, `Blob`, `ArrayBuffer`, canvas, and image
input; those have a single correct encoding.

### Images

`HTMLImageElement` input is drawn onto an offscreen canvas and encoded from
there, because a tainted canvas cannot be read. The util builds a separate
element with `crossOrigin` set _before_ the `src`, because the browser reads the
CORS setting when the fetch starts and your element is never mutated. A source
that is already `complete` (cached, or no `src` yet) skips the wait.

## Notes

- Binary input is chunked at 32 KiB per `btoa` call. Passing one argument per
  byte throws `RangeError` past roughly 64 KiB.
- Encoding runs once after mount and again whenever a getter target changes.
  Two overlapping runs cannot race: a stale result is discarded, not written.
- Objects are duck-typed rather than `instanceof`-checked, so values from
  another realm (an iframe, a worker) still serialize correctly.
- On the server nothing is encoded. `base64` is `''`, `promise` is
  `undefined`, and `execute()` resolves `''`. Populate it after mount to avoid a
  hydration mismatch.

## VueUse parity

| Behavior                                     | Parity                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `string` -> `text/plain`                     | Match                                                                                                                           |
| `Blob` / `File` via `FileReader`             | Match                                                                                                                           |
| `ArrayBuffer` -> raw base64, chunked         | Match; VueUse spreads one argument per byte, which throws `RangeError` on real payloads.                                        |
| canvas and image -> `toDataURL`              | Match. `video` / `audio` are omitted; they belong with `useObjectUrl` work.                                                     |
| `Map` / `Set` / array / object serialization | Match                                                                                                                           |
| `dataUrl`, `type`, `quality`, `serializer`   | Match, including no local defaults for `type` / `quality`.                                                                      |
| `execute()`                                  | Match                                                                                                                           |
| Eight overloaded signatures                  | One signature; the return type is identical across them.                                                                        |
| Source reactivity                            | VueUse watches a `ref`; this takes a getter, since Svelte needs no watcher.                                                     |
| Image element handling                       | Fixed. VueUse clones with `cloneNode(false)`, which copies no attributes, so the clone has no `src` and encodes a blank canvas. |
