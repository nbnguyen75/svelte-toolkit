# TypeScript Strict Rules for @wynn-dev/svelte-use-integrations

Strict mode stays on. Fix the type — never suppress the error.

## 1. Zero Tolerance for Type Escapes

- **No `any`**: Never use `any` or `as any`. Use `unknown` with runtime type guard or generic constraints.
- **No `@ts-ignore`**: Absolutely forbidden. `@ts-expect-error` is allowed ONLY with a mandatory description, and ONLY for temporary upstream library bugs — never to hide your own code issue.
- **No Unsafe Type Assertions (`as T`)**: Avoid casting unless narrowing unknown DOM elements where DOM interfaces are required.
- **No Non-Null Assertion (`!`)**: Never use the `!` operator (e.g., `element!.focus()`). Handle `null` and `undefined` using optional chaining (`?.`), nullish coalescing (`??`), or explicit `if` guards.

## 2. Component Types & Exports

- **Exported Props Interfaces**: Every primitive component must export its props interface (e.g., `DialogRootProps`, `DialogTriggerProps`).
- **Snippet Types**: Use Svelte 5 `Snippet` type for render props / slot equivalents:
  ```ts
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export interface ButtonProps extends HTMLButtonAttributes {
    children?: Snippet;
  }
  ```
- **Bindable Props**: Accurately type `$bindable()` props.
- **Event Handler Typing**: Type all event handlers explicitly using Svelte's element event types (e.g., `KeyboardEvent`, `MouseEvent`).

## 3. Library Packaging & Type Definitions

- **Zero Missing Types**: All components, types, and utilities exported in `src/lib/index.ts` must have valid `.d.ts` generation via `svelte-package`.
- **Public API Surface**: Keep internal implementation details unexported; export clean, well-documented interfaces.
- **Type-only Imports**: Use `import type` for type-only imports.
- **Relative Imports in `src/lib` (publishing constraint)**: Never use path aliases (`@/*`, `$lib`) inside `src/lib` — `svelte-package` copies files without rewriting aliases, so they would survive verbatim into `dist/` and break consumers. Aliases are fine in `docs/src/routes`, tests, and fixtures.
