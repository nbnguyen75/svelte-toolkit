# Utilities & Composables Architecture Rules — svelte-use-integrations (VueUse Port)

`svelte-use-integrations` exists to wrap third-party libraries as idiomatic Svelte 5 reactive adapters (mirroring `vueuse/integrations`) with runes.

## 1. Core Architecture & Ergonomics
- **Svelte 5 Runes**:
  - Use `$state` for reactive values. Use `$state.raw` for large data sets, immutable references, or DOM objects.
  - Use `$derived` and `$derived.by` for all computed/derived calculations.
  - Use `$effect` for side effects, subscriptions, event listeners, observers, and DOM lifecycle.
  - Always clean up subscriptions/listeners when the effect unmounts (return a cleanup function from `$effect`).
  - **Never read and write the same signal inside one effect** (read-then-write aliasing re-triggers the effect — it converges only after a wasted second run and can clobber intermediate writes; use locals for computation, write state once at the end).
  - **Teardown cleanups must not read `$state`** (reads observe pre-teardown values during unmount — writes still apply). Mirror disposal-critical intent (locked flags, restore targets, pending handles) in plain variables captured at action time.
- **Reactive Getters & Object Ergonomics**:
  - When a composable returns multiple reactive values, return getter properties:
    ```ts
    export function useCounter(initialValue = 0) {
      let count = $state(initialValue);
      return {
        get count() { return count; },
        set count(v: number) { count = v; },
        inc: (delta = 1) => count += delta,
        dec: (delta = 1) => count -= delta,
        reset: () => count = initialValue
      };
    }
    ```
  - For complex state machines or multi-field controllers, implement a TypeScript class in `*.svelte.ts`.

## 2. SSR & Environment Safety
- **Universal Safety**:
  - Every utility must be safe for Server-Side Rendering (SvelteKit SSR).
  - Never access `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, or other DOM APIs unconditionally at module evaluation or SSR time.
  - Use `typeof window !== 'undefined'` or check `isClient` helpers before accessing browser globals.
  - Return sensible default/fallback values during SSR.

## 3. Flexibility & Input Handling
- **Flexible Inputs**:
  - Allow arguments to be plain values, functions/getters, or reactive accessors: `type MaybeGetter<T> = T | (() => T)`.
  - Provide typed options objects with sensible defaults.
- **Manual Control**:
  - Utilities that listen to events, timers, or observers should expose explicit `pause()`, `resume()`, `stop()`, or `cleanup()` handles whenever appropriate.

## 4. Packaging & Modularity
- **Flat adapter layout**:
  - `src/lib/<adapter>/` — one directory per third-party wrapper (`useAxios`, `useFuse`, `useIDBKeyval`), no category filing. See [module-contract.md](module-contract.md) §2.
- **Strict Relative Imports**:
  - Inside `src/lib/`, always use relative imports (`./...` or `../...`). Do NOT use `$lib` path aliases in library code to ensure clean package distribution via `svelte-package`.

## 5. Documentation

- **No file-top banner comments**: source files start with code (imports). Never add `/** ... */` module headers — documentation lives on exports and in READMEs, not file headers.
- **JSDoc + `@example` on every exported function** (including each overload): purpose, `@param`, `@returns`/`@default`, plus a runnable 2–5 line `@example` fenced block. Keep examples minimal but real (import + call + one assertion-shaped line where helpful).
- **README per module** (`src/lib/<category>/<name>/README.md`): purpose, signature, options table (every default stated), return table, ≥2 runnable examples including SSR behavior, edge cases/cleanup, and VueUse parity notes.
- **Duck-type DOM checks**: never use `instanceof` against DOM globals (`Window`, `Element`, …) — it fails across realms (iframes, isolated test contexts). Prefer structural checks (`typeof x.scrollY === 'number'`, `nodeType === 1`, method presence). Centralize shared guards in `src/lib/shared/is.ts`.
