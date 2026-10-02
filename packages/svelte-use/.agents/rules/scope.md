# Scope & Porting Decisions — `@wynn-dev/svelte-use`

What belongs in this package, what does not, and how to decide when a new
function is proposed. The library is a VueUse → Svelte 5 port; this file
records the boundaries so they stop being re-litigated.

## 1. Isomorphic Only

Every util must work with **and** without SvelteKit.

- **No `$app/*` imports.** `$app/environment`, `$app/navigation`, `$app/stores`
  are SvelteKit-only. A SvelteKit adapter may wrap them, but core never imports them.
- **No framework-coupled APIs.** No `$lib` aliases, no route objects, no server hooks.
- **Zero runtime dependencies.** Svelte is the only peer. See
  [ponytail.md](ponytail.md) §1.4 — the `@floating-ui/dom` exception recorded there
  belongs to a different project and does **not** apply here.
- **Environment checks use our own `src/lib/shared/is.ts`.** Do not import
  `BROWSER` from `esm-env`: it is a *transitive* Svelte dependency, so a Svelte
  upgrade could remove it and break every SSR guard in the package.
- **SSR fallbacks must be sensible**, not just non-throwing. See
  [utilities-architecture.md](utilities-architecture.md) §2.

## 2. No Module-Scope Mutable State

Server modules are evaluated **once and shared across every request**, so any
module-level mutable value leaks between users.

Forbidden at module scope in `src/lib/**/*.svelte.ts`:

```ts
let counter = 0;                    // shared across requests
const cache = new WeakMap();        // shared across requests
const defaults = { x: 0 };          // leaks if mutated rather than cloned
const state = $state(0);            // shared reactive source
```

Required instead:

- Create every reactive value **inside** the function call (one instance per caller).
- For something that must be genuinely shared across components (a counter, a
  registry), make it a **factory** the caller invokes, or scope it through
  context — never a bare module singleton. `createSharedComposable` exists for
  exactly this and is deliberately not a module-level cache.
- Module scope is fine for **immutable** constants: frozen option bags, string
  arrays, numeric defaults, pure helper functions.
- If a refcount or id counter must be shared, key it by element in a `WeakMap`
  owned by the returned instance, not by a module-level counter.

Audit command (must return nothing):

```sh
git grep -nE '^(let|const|var) ' -- 'src/lib/**/*.svelte.ts'
```

Every hit needs a one-line justification: immutable constant, or per-instance.

## 3. Recipe vs. Library Code

`function.status` in `feature_list.json` is the authority: `done`, `todo`,
`cut`, `deferred`, or `svelte-native`. Rationale and copy-paste snippets live in
[`docs/recipes.md`](../../docs/recipes.md).

A function earns library code if **any** of these hold:

1. **Lifecycle ownership** — it wraps a subscribe/observe API, and the value is
   preventing leaks. (`useEventListener`, `useMutationObserver`, `useWebSocket`)
2. **Environment branching** — feature detection, SSR fallback, or cross-browser
   normalization. (`useSupported`, `useCssSupports`, `useMediaQuery`, `useColorMode`)
3. **State a template cannot express** — needs refcounting, persistence, or
   multi-signal coordination. (`useStyleTag`/`useScriptTag` refcounting, `useStorage`)
4. **A real algorithm with options worth owning and testing.** (`useSorted`, `useElementSize`)
5. **A building block for another util in this package.**

Otherwise it is a **recipe**. Concretely: if it is a 1–3 line `$derived` or
`$effect` over Svelte itself or over primitives already exported here, it is a
recipe. A wrapper there costs an import, a type, a README, and a test to save
two lines — and it *loses* composability, since a caller cannot spread a util's
return into their own `$derived`.

Do not write a recipe for anything that fits on screen without scrolling. The
heuristic we publish to users is exactly that: **if the recipe fits without
scrolling, don't take the import.**

## 4. Do Not Re-Propose (wont-port)

These are settled. If a VueUse function is absent, this is why.

| Group | Functions | Reason |
| --- | --- | --- |
| electron (5) | `useIpcRenderer`, `useIpcRendererInvoke`, `useIpcRendererOn`, `useZoomFactor`, `useZoomLevel` | Electron runtime only |
| firebase (3) | `useAuth`, `useFirestore`, `useRTDB` | Firebase SDK runtime |
| router (3) | `useRouteHash`, `useRouteParams`, `useRouteQuery` | `vue-router`-coupled; a SvelteKit equivalent needs `$app/*`, which core forbids |
| rxjs (7) | `from`, `toObserver`, `useExtractedObservable`, `useObservable`, `useSubject`, `useSubscription`, `watchExtractedObservable` | RxJS runtime |
| integrations (12) | `useAsyncValidator`, `useAxios`, `useChangeCase`, `useCookies`, `useDrauu`, `useFocusTrap`, `useFuse`, `useIDBKeyval`, `useJwt`, `useNProgress`, `useQRCode`, `useSortable` | each adds a third-party dep; belongs in `@wynn-dev/svelte-use-integrations` (tracked in that package's own `feature_list.json`) |
| Vue DI / template (12) | `computedInject`, `createInjectionState`, `provideLocal`, `injectLocal`, `createReusableTemplate`, `createTemplatePromise`, `useVModel`, `useVModels`, `useCurrentElement`, `useParentElement`, `useTemplateRefsList`, `createDisposableDirective` | Vue component/template model; no Svelte equivalent |
| Vue refs (5) | `createRef`, `toRef`, `toRefs`, `unrefElement`, `createUnrefFn` | Vue `ref`/`unref` model; Svelte uses `$state` and getters |
| Vue lifecycle (6) | `tryOnBeforeMount`, `tryOnBeforeUnmount`, `tryOnMounted`, `tryOnScopeDispose`, `tryOnUnmounted` | replaced by `$effect` cleanup |

`@wynn-dev/svelte-use-integrations` declares third-party libs as **optional peer**
dependencies — never bundled. It may declare `@wynn-dev/svelte-use` as a
**`workspace:*` dependency** when an adapter reuses core utils, so a consumer can
never end up with two copies holding split state. Core never depends back, and
neither package depends on any future `kit` package.
Publish `@wynn-dev/svelte-use` first.

## 5. Platform Primitives We Delegate To

Svelte 5.11+ ships these. Prefer them over hand-rolled listeners; do **not**
re-wrap them without adding option surface a consumer actually needs.

| Primitive | Import | Replaces |
| --- | --- | --- |
| `scrollX`, `scrollY`, `innerWidth`, `innerHeight`, `outerWidth`, `outerHeight`, `screenLeft`, `screenTop`, `online`, `devicePixelRatio` | `svelte/reactivity/window` | `useOnline`, `useDevicePixelRatio` (both `svelte-native`) |
| `MediaQuery` | `svelte/reactivity` | backs `useMediaQuery`; used by `useDark` |
| `SvelteSet`, `SvelteMap`, `SvelteDate`, `SvelteURL`, `SvelteURLSearchParams` | `svelte/reactivity` | reactive collections |
| `createSubscriber` | `svelte/reactivity` | the idiomatic way to wrap an event/observer as reactive state — adopt **only** when a util needs a reactive event *value*, not a side effect |

These are module-level singletons with SSR-safe `undefined` fallbacks and
built-in cleanup. Reading `innerWidth.current` subscribes to one shared
`ReactiveValue`; our utils sit on top to add option surface, they do not
re-register the same listener.

Do **not** reimplement a primitive to add an option nothing uses. `useWindowSize`
keeps `initialWidth`/`initialHeight`/`includeScrollbar`/`listenOrientation`
because those solve real hydration and scrollbar problems; a zero-option
delegation is a recipe, not a util.

### 5.1 Version Floors (settled — do not re-derive)

`peerDependencies.svelte` is **`^5.11.0`**. The floor is the *later* of the two
modules below, chosen so both are available and the range does not have to move
again:

| Module / export | Available since |
| --- | --- |
| `svelte/reactivity` — `MediaQuery`, `createSubscriber`, `SvelteSet`/`SvelteMap`/`SvelteDate`/`SvelteURL`/`SvelteURLSearchParams` | **5.7.0** |
| `svelte/reactivity/window` — `scrollX`, `innerWidth`, `online`, … | **5.11.0** |

**Why the floor matters.** A subpath import fails at *build* time, not install
time. With `"svelte": "^5.0.0"`, a consumer on 5.4 satisfies the peer check, npm
reports success, and the build then dies on a module-not-found error for
`svelte/reactivity`. Nothing but the range prevents that. If you add a
`svelte/reactivity` import, confirm `peerDependencies.svelte` already covers it.

### 5.2 SSR Behavior Of These Modules

`package.json` exports `./reactivity` under `browser`/`worker`/`default`
conditions, so the server build resolves identity stubs:

```ts
// server entry
export const SvelteMap = globalThis.Map;
export function createSubscriber(_) {} // no-op
export class MediaQuery {}            // stub
```

Consequences for our code:

- `new SvelteMap()` during SSR yields a plain `Map` — usable, not reactive.
  Correct. No guard needed.
- `createSubscriber` on the server is a no-op, so a getter calling it simply
  does not subscribe. Correct. No guard needed.
- **`new MediaQuery(...)` is a stub on the server.** Guard with `isBrowser`
  *before* constructing, exactly as `useDark` does. Do not construct it at
  module scope (§2) — each caller needs its own instance anyway.

### 5.3 Coverage Is Narrow — Check Before Adopting

The module exports 7 symbols. **None of them is a timer.** There is no
`useIntervalFn`/`useTimeoutFn`/`useRafFn`/`useCountdown`/`useFps` primitive, so
feat-011's timing batch cannot delegate and must be implemented directly.

There is also no collection- or URL-shaped util in `feature_list.json` today, so
`SvelteSet`/`SvelteMap`/`SvelteURL` have no current caller either.

**Adopt at the point of use, not as a policy.** `MediaQuery` in `useDark` was
adopted because it fixed a real defect (see §5.4). `createSubscriber` was
deliberately *not* adopted for `useEventListener`: that util returns `void` and
has no reactive value to read, so a subscription mechanism buys nothing while
the 5 overloads (which type by event map either way) remain regardless.

### 5.4 `useDark` Uses `MediaQuery` — Do Not Revert

`useDark` previously called `window.matchMedia(DARK_MEDIA_QUERY)` **inside a
getter** passed to `useEventListener`. A getter re-resolves on every effect run,
so each run constructed a fresh `MediaQueryList` and rebound a listener. That
was a defect, not a style choice.

The fix is one `MediaQuery` instance created once inside the factory, read via
`.current`. Do not "simplify" it back to `matchMedia` in a getter — that
reinstates the repeated-construction behavior.

## 6. Roadmap Tiering (why the order is what it is)

VueUse publishes no per-function download statistics, so popularity tiers use a
**proxy**: everyday app needs → common DOM/sensor needs → specialized needs.
Within a tier, batches are dependency-ordered, foundations first.

| Tier | Contents |
| --- | --- |
| 0 | Retrofit only (docs/tests + known fixes) — `feat-002/003/004` |
| 1 | State/timing essentials most apps import first |
| 2 | Everyday browser/DOM (viewport, elements, scroll, mouse, keyboard) |
| 3 | Sensors/network/persistence/async |
| 4 | Page UI, animation, niche device APIs, math, type utils |

This is the reasoning behind the sequence of `feat-NNN` ids in
`feature_list.json`. Do not reorder ids to chase a new "most popular" claim —
tiers are a heuristic, and dependency order within a tier matters more than the
tier itself.

## 7. Two Packages & Naming Conventions

The repo holds two publishable packages with different dependency rules:

| Package | Contents | Dependency rule |
| --- | --- | --- |
| `@wynn-dev/svelte-use` (this one) | Core utils: browser/DOM/Svelte-only, zero-dep | **Zero runtime deps** — Svelte is the only peer |
| `@wynn-dev/svelte-use-integrations` | Thin wrappers over third-party libs | External libs as **optional peerDeps, never bundled**; may take core as `workspace:*` dep; tracked in its own `feature_list.json` |
| Recipes (`docs/recipes.md`) | Copy-paste snippets for everything `cut` | Not code at all — no import, no test, no README |

A SvelteKit-only package (`useRouteParams`-style over `$app/*`) does not exist
yet; create it only when a real port needs it. Core must never import `$app/*`
(§1) so it works in plain Svelte.

Naming (pick exactly one per export, never mix):

- **`useXxx()`** — function called in `<script>`, returns reactive state
  (getter object or class instance). (`useMouse`, `useEventListener`)
- **Attachment factory** — verb/noun **without** the `use` prefix, returns
  `Attachment` from `svelte/attachments`, used as `{@attach name(...)}`.
  Never ship a legacy `use:` action alongside it. Example:
  ```ts
  import type { Attachment } from 'svelte/attachments';

  export function clickOutside(handler: (e: MouseEvent) => void): Attachment {
    return (node) => {
      const onClick = (e: MouseEvent) => {
        if (!node.contains(e.target as Node)) handler(e);
      };
      document.addEventListener('click', onClick);
      return () => document.removeEventListener('click', onClick);
    };
  }
  ```
- **Class (PascalCase)** — complex state machines with many methods
  (`PersistedState`-style). Simple subscribe-and-return utilities stay functions.
- In docs, call them **utilities** (neutral in Svelte: not SvelteKit hooks,
  not template actions).

Before porting a new function, check prior art (**Runed**, `svelte/reactivity`,
`docs/recipes.md`) to avoid duplicating what Svelte or the ecosystem already
ships — see §5 and the recipe test in §3.
