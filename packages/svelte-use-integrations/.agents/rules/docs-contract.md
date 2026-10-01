# Docs Contract — `@wynn-dev/svelte-use-integrations`

Two audiences: someone reading the README in a browser, and someone hovering
the symbol in their editor. Both must be able to learn usage without opening
the other. JSDoc and README must not drift.

## 1. Per-Util `README.md`

`src/lib/<category>/<name>/README.md` must contain, at minimum:

1. **One-line purpose** + link to the VueUse source (or a `custom` label).
2. **Signature block** — the import and the call shape.
3. **Options table** — option, type, default, description. *Every* default stated.
4. **Return table** — field, type, and reactivity note (getter-backed / method).
5. **≥2 runnable examples** — basic usage, plus an SSR note stating what
   renders on the server.
6. **Edge cases & cleanup** — `cancel`/`stop`/`flush`/`pause`/`resume`
   semantics, and what happens on unmount.
7. **Parity notes** — every intentional divergence from VueUse. Examples:
   no Vue `MaybeRefOrGetter` (we use `MaybeGetter<T>`); no promise rejection on
   cancel unless documented; a util that reports `false` for a missing API
   instead of throwing.

Use [`docs/module-readme-template.md`](../../docs/module-readme-template.md) as
the starting skeleton.

## 2. JSDoc on Exports

JSDoc on exports must mirror the tables above — reviewers read code, users read
the README, and both must agree.

- **Every exported function**, **including each overload**, carries JSDoc with:
  purpose, `@param`, `@returns` / `@default`, and a runnable 2–5 line
  `@example` fenced block. IDE hovers should teach usage.
- **No file-top banner comments.** Implementation files start with code
  (imports). Never add a `/** … */` module header — documentation lives on
  exports and in READMEs, never in file headers.
- Import specifiers in examples name the published package: `'@wynn-dev/svelte-use-integrations'`.
  Never the repo name.

## 3. Overview Docs

Per-util READMEs are not an overview. A reader arriving cold needs:

- The **package README** (`packages/README.md`) — what the library is, install,
  a quick start, the reactivity conventions that differ from Vue (getter-backed
  returns, `$effect` cleanup, SSR fallbacks), and a category index.
- The **docs site** (`docs/`) — a browsable reference per category, plus the
  recipes for everything deliberately not ported.
- **`docs/recipes.md`** — the *why* behind every `cut` / `deferred` /
  `svelte-native` decision, with copy-paste patterns.

Do not hand-maintain a 200-row function table; it goes stale. The per-module
READMEs are the source of truth and the docs site renders them from there.
