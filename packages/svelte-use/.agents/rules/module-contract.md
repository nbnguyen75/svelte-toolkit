# Module Contract — `@wynn-dev/svelte-use`

The per-module file layout and export rules. Every public util/hook follows
this exactly; `svelte-package` and `publint` both depend on it holding.

## 1. Layout

Each util lives in its own directory with exactly these files:

```
src/lib/<category>/<utilName>/
  index.ts             — public surface: Options/Return interfaces + re-export.
                         JSDoc on EVERY export (purpose, @param, @returns,
                         SSR behavior, VueUse parity notes / divergences).
  index.svelte.ts      — implementation, ONLY if runes are needed.
                         Pure logic stays in index.ts (testable w/o compiler).
  <utilName>.test.ts   — vitest suite. Colocated; excluded from dist via
                         package.json files/negation + prepack.
  README.md            — docs per docs-contract.md. Colocated so docs travel
                         with code.
```

If a util needs no runes, `index.svelte.ts` is omitted and the implementation
lives in `index.ts` — pure logic must stay compiler-free so it is testable
without the Svelte toolchain and ≥90% branch-coverable.

Attachments follow the same layout; directory and factory are named **without**
the `use` prefix (`src/lib/browser/clickOutside/` exports `clickOutside()`).
See [scope.md](scope.md) §7.

## 2. Categories

Existing: `browser/`, `elements/`, `state/`, `utilities/`, `shared/`.

- `browser/` — DOM, window, storage, media, clipboard, dark mode, gestures.
- `elements/` — measurement, visibility, focus, observers on elements.
- `state/` — reactive state helpers, history, storage, ref variants.
- `utilities/` — timing, debounce/throttle, async helpers.
- `shared/` — type guards, getters, array/object utils, pure algorithms.

**Never pre-create empty folders.** Add a category only when a batch requires it
(`network/`, `sensors/`). Category is a filing convention for humans; it is
deliberately *not* a packaging boundary — see [scope.md](scope.md).

## 3. Barrel & Re-Export Rules

`src/lib/index.ts` re-exports every module, keeping `// * Category` group
comments.

- **One canonical export path per module.** A dual `export *` from two paths
  makes the export ambiguous and the bundler drops it silently.
- Because of that, `useDebounceFn`/`useThrottleFn` are filed under
  `utilities/` even though VueUse files them under `shared/`. The deviation is
  noted in their READMEs.
- When adding a module, verify the whole public surface still resolves. A flat
  `export *` list hides ambiguity drops, so check it explicitly — see
  [batch-workflow.md](batch-workflow.md) step 5.
- **Never use path aliases inside `src/lib/`** (`$lib`, `@/*`).
  `svelte-package` copies files without rewriting aliases, so they would ship
  verbatim into `dist/` and break consumers. Aliases are fine in tests,
  fixtures, and the docs app.

## 4. Reactive Return Shape

Return **getter properties** so destructuring does not lose reactivity:

```ts
return {
  get value() { return state; },
  set value(v: T) { state = v; },
  stop: () => { /* cleanup */ }
};
```

For multi-field state machines, use a class in `*.svelte.ts`. Inputs are
`MaybeGetter<T> = T | (() => T)`. Full rules: [utilities-architecture.md](utilities-architecture.md).

## 5. Source Provenance

Every port records its VueUse origin. Utils with no VueUse equivalent are
labelled `custom` in their README and JSDoc (e.g. `useScrollToTop`).

The VueUse checkout is **not** a fixed absolute path. Resolve it in this order:

1. `$VUEUSE_SRC` if set,
2. `../../vueuse/packages` relative to this package root.

Never commit a machine-specific absolute path — a grep gate in
[phase-gate.md](phase-gate.md) fails the build if one appears.
