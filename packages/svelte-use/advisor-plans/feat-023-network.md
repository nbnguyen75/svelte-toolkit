# feat-023 "Network & connectivity" — implementation plan

Written against commit `73dc353`. Executor: implement in batch order A → D,
one batch per commit. All code in `packages/svelte-use/`, new `src/lib/network/`
category (module-contract allows a new category when a batch requires it).

## Verification gates (every batch)

```sh
bun run format:fix
bun run lint:fix
bun run check        # 0 errors / 0 warnings
bun run test         # full suite green
bun run prepack      # dist builds, publint clean
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
```

Then: `feature_list.json` statuses + evidence, `progress.md` entry, `session-handoff.md`
counts. Never commit without being asked.

## Conventions (do not re-derive)

- Relative imports inside `src/lib/` only; no `$lib` aliases.
- Inputs are `MaybeGetter<T>` from `../../shared/getter.ts`, read via `resolveGetter`.
- Guards from `../../shared/is.ts` (`isBrowser`, `isSupported`-style inline checks).
- **Structural probes, never `instanceof` on DOM globals** (cross-realm).
  For anything you will _invoke_, probe `typeof x === 'function'`, not `in`
  (an `in` check accepts a present-but-`undefined` stub and then throws on the
  call — this bit `useElementByPoint`).
- Reactive returns are getter-backed objects; never destructure another util's
  getters. An option must not get a `$derived` of its own (it caches).
- No module-scope mutable state in `*.svelte.ts`. Listeners/observers/timers
  bind in `$effect` with cleanup; a public `stop()` only where upstream has
  one or the util needs manual teardown.
- Tests: `node` env default; jsdom pragma only where DOM is needed. No network,
  no real timers — stub globals, `vi.useFakeTimers()`. SSR probe per util.
- No `as` casts (`no-unsafe-type-assertion` is an error); no `?.` on
  non-optional DOM methods (`no-unnecessary-condition`).
- No new runtime dependencies. Svelte is the only peer.
- `createFetch` (useFetch's factory) ships too — it is module API, not a second
  util. No other helper in this batch becomes public surface.

## Scope decisions (yardstick applied)

All 8 earn library code — every one owns lifecycle (bind/close/abort/reconnect)
or environment branching (SSR fallbacks, capability detection). None is a 1–3
line derived. Nothing is cut.

## Batch A — small listener/state utils (do first)

`useNetwork`, `useBrowserLocation`, `useShare`, `useUrlSearchParams`.
Targets: `src/lib/network/<name>/` with `index.svelte.ts`, `index.ts`,
`<name>.test.ts`, `<name>.ssr.test.ts`, `README.md`. Barrel-export each from
`src/lib/index.ts` under a new `// * Network` group.

### useNetwork (source: `vueuse/packages/core/useNetwork/index.ts`, 133 lines)

- Fields: `isSupported`, `isOnline`, `offlineAt`, `onlineAt`, `downlink`,
  `downlinkMax`, `effectiveType`, `rtt`, `saveData`, `type` ('unknown' default).
- Own the `online`/`offline` window listeners via internal `bindListener`
  (`../browser/useEventListener/bind.ts`), passive. `connection` change
  listener only when `navigator.connection` exists. SSR: bind nothing; defaults
  are `isOnline: true`, timestamps `undefined`, `type: 'unknown'`.
- `navigator.connection` is untyped in lib.dom — read it through a structural
  probe, do not cast. jsdom has no `connection`: tests define it with
  `Object.defineProperty(navigator, 'connection', …)` and delete after.
- Timestamps use `Date.now()` (fakes fine under fake timers).

### useBrowserLocation (source: `vueuse/packages/core/useBrowserLocation/index.ts`, 86 lines)

- Rebuild a `$state` location object on `popstate` + `hashchange`
  (`trigger: 'load' | 'popstate' | 'hashchange'`), including `history.state`,
  `history.length`, `location.origin`. SSR: all fields `undefined` except
  `trigger: 'load'`.
- The 8 writable URL parts are getter/setter pairs writing through to
  `window.location` (guarded); skip the write when already equal (prevents
  navigation loops in tests and in life).
- Return shape: upstream returns one `Ref<BrowserLocationState>`. Port as a
  getter-backed object exposing each field (including setters for the 8
  writables) — matches the package's getter convention and stays
  destructure-safe.
- jsdom `window.location` is stubbed per test; changing `href` navigates jsdom
  (throws "not implemented") — test setters against `hash`/`search` only, or
  stub `location` object wholesale.

### useShare (source: `vueuse/packages/core/useShare/index.ts`, 59 lines)

- `shareOptions` is `MaybeGetter<UseShareOptions>` (upstream parity adds the
  getter; plain object still works). `share(override?)` merges and calls
  `navigator.share` only when `canShare(data)` grants; resolves `undefined`
  otherwise (never throws for unsupported — matches upstream).
- `isSupported`: `'canShare' in navigator`-style probe on the resolved
  navigator. SSR `false`.
- Types: keep `UseShareOptions` (title/files/text/url) and `NavigatorWithShare`
  local to the module. `files?: File[]` — no DOM needed for the type.
- Tests stub `navigator.share`/`navigator.canShare` on a throwaway object
  passed via options (do not fight jsdom's navigator more than needed).

### useUrlSearchParams (source: `vueuse/packages/core/useUrlSearchParams/index.ts`, 159 lines)

- Modes `history | hash | hash-params`, options `removeNullishValues`
  (default true), `removeFalsyValues` (default false), `initialValue`
  (default `{}`), `write` (default true), `writeMode` (default `'replace'`),
  `stringify` (default `params.toString()`). Port `getRawParams` /
  `constructQuery` logic directly; all `window` access behind `isBrowser`.
- State is a `$state` record. Write-back runs in `$effect` (tracks state
  reads, calls `history.replaceState`/`pushState`); the effect never mutates
  state itself, so no pause/resume machinery is needed — but PROVE no loop
  with a test that writes twice and asserts one history entry per write.
- External changes arrive via `popstate` (+ `hashchange` when mode isn't
  history) → re-read URL into state. No `window` → return `$state(initialValue)`
  with no listeners (matches upstream's early return).
- `updateDataOnError`-style conflicts don't exist here; multi-values become
  arrays, single values strings, missing keys `''` (upstream semantics — pin
  with tests).
- jsdom: drive `window.location.search` via `history.replaceState`, dispatch
  `popstate` manually. `writeMode: 'push'` test asserts `history.length`
  grows; `replace` asserts it doesn't.

## Batch B — connections with open/close (second)

`useBroadcastChannel` (80-line source), `useEventSource` (230-line source).

### useBroadcastChannel

- Open the channel in `$effect` (not at setup — matches upstream's
  `tryOnMounted`, and SSR-safe by construction), close on effect cleanup AND
  on manual `close()`. `isClosed` state mirrors both paths.
- `post` no-ops when there is no channel. `data`/`error` getters.
- jsdom has no `BroadcastChannel`: stub a fake class via `vi.stubGlobal`
  capturing instances; assert post/close delegation and message routing.
- SSR: `isSupported: false`, everything else null/false, `post`/`close`
  no-ops. `channel` exposed as getter (upstream exposes the ref).

### useEventSource

- Port options verbatim: `autoReconnect` (bool | `{ retries, delay,
onFailed }`), `immediate` (default true), `autoConnect` (default true),
  `serializer.read`, `withCredentials` passthrough. Events default to
  `['message']`. Status `CONNECTING | OPEN | CLOSED`; `close()` sets
  `explicitlyClosed`; `open()` resets `retried` and reconnects.
- Reconnect only when `readyState === 2` (EventSource's own retry covers the
  rest) — this is upstream's subtle core, pin it with a test.
- Retry timer: plain `setTimeout` in a plain variable, cleared on
  close/unmount (effect cleanup reads the handle from a plain variable —
  teardown cleanups must not read `$state`).
- URL changes re-open via `$effect` tracking the resolved URL (upstream's
  `watch(urlRef, open)`), gated by `autoConnect`.
- jsdom has no `EventSource`: fake stub class with controllable
  `readyState`/`onopen`/`onerror`/`close`; fake timers for `delay`;
  `retries` count/predicate/`onFailed` each pinned.
- No `withCredentials` test needs a network — assert it reaches the
  constructor init dict.

## Batch C — useFetch (third, alone; 664-line source)

- Port the full option surface: `fetch` injectable (tests MUST inject a stub —
  no network), `immediate` (default true), `refetch`, `initialData`,
  `timeout` (via shipped `useTimeoutFn`), `updateDataOnError`, `beforeFetch` /
  `afterFetch` / `onFetchError` interceptors, method helpers
  (`get/post/put/delete/patch/head/options`), type helpers
  (`json/text/blob/arrayBuffer/formData`), `createFetch` factory with
  `combination: 'chain' | 'overwrite'`.
- `createEventHook` does not exist in this package: implement a minimal local
  `on/trigger` hook inside the `useFetch` module (not shared, not exported —
  only useFetch needs it).
- `waitUntilFinished` must NOT use `until`: `until` builds its own `$effect`
  and `.then` continuations run outside component init (`effect_orphan` — this
  bit `usePointerLock`). Settle from an init-time `$effect` the way
  `usePointerLock.awaitLock` does, or resolve from the fetch promise chain
  directly. (Preferred: resolve from the promise chain — no extra effect at
  all. If upstream's `until(isFinished)` shape is kept, reuse the awaitLock
  pattern, not `until`.)
- `executeCounter` guards stale resolutions (overlapping executes) — port
  verbatim, pin with a test (slow first request resolves after fast second;
  only second wins).
- `setMethod`/`setType` return `undefined` while fetching (upstream behavior —
  pin it, do not "fix" it).
- `isFetchOptions` arg-dispatch and `combineCallbacks` port directly;
  `headersToObject` handles `Headers` instances (guard `typeof Headers`).
- PromiseLike surface: `await useFetch(url).json()` works via `then`. Pin in
  tests with the stub fetch.
- `refetch` watches URL + payload: `$effect` tracking both, gated by the
  resolved `refetch` flag (read the flag inside the effect, not in a derived
  of its own).
- SSR: `immediate` still executes (upstream parity — `fetch` exists on the
  server); document it. `supportsAbort` is a `typeof AbortController` check.

## Batch D — useWebSocket (last, alone; 353-line source)

- Port options verbatim: callbacks (`onConnected/onDisconnected/onError/
onMessage`), `heartbeat` (bool | `{ message, responseMessage, pongTimeout,
scheduler }`), `autoReconnect` (`{ retries, delay, onFailed }`),
  `immediate`/`autoConnect`/`autoClose` (all default true), `protocols`.
- Heartbeat scheduler defaults to shipped `useIntervalFn(cb, 1000,
{ immediate: false })` — the exact upstream default, and the reason that
  util exists. `pause`/`resume` held in plain variables.
- Send buffer (`useBuffer` default true), flushed on open; `send` returns
  boolean. `close(code = 1000)`; `pongTimeout` expiry closes and re-arms
  (`explicitlyClosed = false` so auto-reconnect fires — port verbatim).
- `beforeunload` listener + dispose → `close()` when `autoClose`.
- `isClient || isWorker` shape kept (`isWorker` exists in `shared/is.ts`).
- jsdom has no `WebSocket`: fake stub class with scripted open/message/close;
  fake timers for heartbeat/reconnect; assert buffer flush order, heartbeat
  ping/pong filtering (pong responses never reach `data`), retry counts and
  `onFailed`.
- Protocols reach the constructor; assert via stub capture.

## Stop conditions (all batches)

- If any function proves to be a 1–3 line derived over shipped primitives,
  cut it to `docs/recipes.md` (delete its entry — the file tracks only what
  ships) instead of padding it. The plan author believes none will, but the
  yardstick outranks the plan.
- If `useFetch`'s surface proves unportable in one batch, split it
  (core execute/abort first, interceptors/factory second) — do not shrink it
  silently.
