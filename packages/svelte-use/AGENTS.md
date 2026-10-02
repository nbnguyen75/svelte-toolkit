# AGENTS.md

Project harness for reliable agent-assisted development on
**`@wynn-dev/svelte-use`** (TypeScript + Svelte 5 utility library package,
Bun-managed). The repository is named `svelte-toolkit`; the published package is
`@wynn-dev/svelte-use`.

`@wynn-dev/svelte-use` is a comprehensive collection of essential Svelte 5 utilities and composables,
bringing the reactivity, power, and developer experience of **VueUse** (`$VUEUSE_SRC`) to the Svelte 5 ecosystem using modern Runes.

---

## Repository Layout

- This package root (`packages/svelte-use/`) — the publishable library (`src/lib`, `prepack`/`publint`) and its self-contained harness (this AGENTS.md, `.agents/`, `.claude/`, `init.*`, `feature_list.json`, `skills-lock.json`, `eslint`/`oxfmt`/`oxlint` configs). Strict relative imports only within `src/lib/`. Sibling package `svelte-use-integrations/` follows the same contracts; repo-root and `packages/` AGENTS.md files are refer-only pointers to this file.
- `src/lib/` — categorized composables and utilities:
  - `src/lib/browser/` — Browser/DOM utilities (`useEventListener`, `useDark`, `useClipboard`, `useSmoothScroll`, etc.)
  - `src/lib/elements/` — Element measurement, visibility, focus, and observers (`useIntersectionObserver`, `useResizeObserver`, `useFocus`, etc.)
  - `src/lib/state/` — Reactive state helpers (`useStorage`, `useToggle`, `useCloned`, `refAutoReset`, `until`, etc.)
  - `src/lib/utilities/` — Timing and control helpers (`useDebounceFn`, `useThrottleFn`, `useTimeoutFn`, `useCountdown`, etc.)
  - `src/lib/shared/` — Internal helpers only (`is.ts`, `getter.ts`); nothing here is a util, and nothing is exported as one
- Source of truth for Vue original logic: `$VUEUSE_SRC/packages/`
  — resolved from the `$VUEUSE_SRC` env var, else `../../vueuse/packages`
  relative to this package root. Never commit a machine-specific absolute
  path; `.\init.ps1` gate 6 fails the build if one appears.

---

## Startup Workflow

Before writing any code:

1. **Confirm working directory** with `pwd`
2. **Read this file** completely
3. **Read project rules** in `.agents/rules/`:
   - `scope.md` — what is/isn't in scope, wont-port groups, recipe-vs-library test, no module-scope mutable state, Svelte primitives we delegate to
   - `utilities-architecture.md` — Svelte 5 runes reactivity, getters/classes, SSR guards, listener cleanups
   - `module-contract.md` — per-module file layout, category, barrel/typing rules
   - `docs-contract.md` — per-util README contents, JSDoc requirements, overview docs
   - `test-contract.md` — vitest config facts and the per-util test checklist
   - `typescript.md` — strict TypeScript rules, exported interfaces, zero `any`
   - `ponytail.md` — simplification ladder, zero bloat, YAGNI, standard DOM before custom JS
   - `batch-workflow.md` — the per-feature loop: research → implement → test → verify → evidence
   - `phase-gate.md` — done criteria: implementation + verification + evidence
   - `improve.md` — quality and architecture standards
4. **Run `.\init.ps1`** (or `./init.sh` on bash) to verify environment health
5. **Read `feature_list.json`** to see roadmap status and identify the next feature to port
6. **Review recent commits** with `git log --oneline -5`

If baseline verification fails, repair it before adding new scope.

---

## Standard Package Commands

Always use the standard npm/bun scripts configured in `package.json` for validation and formatting:

| Command                    | Action                         | Underlying Tool                              |
| -------------------------- | ------------------------------ | -------------------------------------------- |
| `bun run check`            | Typecheck components & modules | `svelte-check`                               |
| `bun run check:watch`      | Watch mode typecheck           | `svelte-check --watch`                       |
| `bun run format`           | Verify formatting compliance   | `oxfmt --check`                              |
| `bun run format:fix`       | Format codebase automatically  | `oxfmt`                                      |
| `bun run lint`             | Lint codebase for errors       | `oxlint && eslint src --ext .svelte --cache` |
| `bun run lint:fix`         | Autofix lint issues            | `oxlint --fix && eslint src --fix --cache`   |
| `bun run prepack`          | Package verification & build   | `svelte-package && publint`                  |
| `bun run test`             | Unit tests                     | `vitest run`                                 |
| `.\init.ps1` / `./init.sh` | Full baseline environment run  | All gates, incl. path-leak scan              |

---

## Working Rules

- **One feature at a time**: Pick exactly one feature from `feature_list.json` and work its functions. Non-trivial batches get an `improve` plan first.
- **Isomorphic core, zero runtime dependencies**: no `$app/*` imports, no third-party runtime deps (Svelte is the only peer). See `scope.md` §1.
- **Svelte 5 Runes Only**: Use `$state`, `$derived`, `$derived.by`, `$effect`, `$bindable`.
- **Reactive Return Values**: Expose reactive state via getter properties (`get value() { return state; }`) or state classes so destructuring doesn't lose reactivity.
- **SSR & Browser Guards**: Every DOM/browser API access must check `typeof window !== 'undefined'` or run safely inside `$effect`.
- **No Module-Scope Mutable State**: Module scope is for immutable constants only — server modules are shared across requests. See `scope.md` §2.
- **Zero Memory Leaks**: Always return cleanup functions or provide `.stop()` / `.cleanup()` methods for event listeners, observers, and timers.
- **Check Svelte first**: Before implementing, see whether `svelte/reactivity` or `svelte/reactivity/window` already covers it (`scope.md` §5). No timer primitive exists there, so the timing utils (`useIntervalFn`, `useTimeoutFn`, `useCountdown`, `useRafFn`, `useFps`) must be hand-rolled.
- **Peer Floor Is `^5.11.0`**: `svelte/reactivity` requires 5.7.0+ and `svelte/reactivity/window` requires 5.11.0+. A subpath import fails at build time, not install time, so `peerDependencies.svelte` is the only thing that catches an unsupported version. Do not lower it without checking `scope.md` §5.1.
- **Strict TypeScript**: Export options and return types for each utility from its module folder (`index.ts`). No `any`, no `@ts-ignore`.
- **Relative Imports Inside `src/lib/`**: Never use `$lib` path aliases inside `src/lib/` — `svelte-package` does not rewrite aliases in `.d.ts` / `.js` files.
- **Formatting & Linting First**: Use `bun run format:fix` and `bun run lint:fix` during editing.
- **Verification Required**: Never claim a task is complete without running `.\init.ps1` (or `bun run check && bun run format && bun run lint && bun run test && bun run prepack`).
- **Never Commit Absolute Paths**: Reference an external checkout as `$VUEUSE_SRC` or a repo-relative path. Gate 6 enforces it.
- **Update Artifacts**: Update `feature_list.json` (implement-only) and `progress.md` at each milestone; anything not ported goes in `docs/recipes.md`, never in `feature_list.json`.

---

## Svelte MCP Tools & Available Agents

When working with Svelte code, use the Svelte MCP tools:

1. `list-sections`: Discover available Svelte 5 / SvelteKit documentation sections.
2. `get-documentation`: Fetch full documentation for runes and patterns (`$state`, `$derived`, `$props`, `snippets`, etc.).
3. `svelte-autofixer`: Analyze Svelte code to detect issues before finalizing.

---

## Skill Routing

Load the most specific skill for the task:

| Task / Domain                 | Skill                                                     |
| ----------------------------- | --------------------------------------------------------- |
| Vue / VueUse Logic Analysis   | `vue-to-svelte-analyze`                                   |
| VueUse to Svelte 5 Porting    | `vue-to-svelte-port`                                      |
| VueUse Function Reference     | `vueuse-functions`                                        |
| Svelte 5 Reactivity & Runes   | `svelte-core-bestpractices`, `svelte-code-writer`         |
| Modern JS / TypeScript Types  | `modern-javascript-patterns`, `typescript-advanced-types` |
| Simplification & Minimal Code | `ponytail` (always active)                                |
| Quality & Architecture        | `improve` (always active)                                 |
| Refactoring & Code Smells     | `refactor`                                                |
| Research & Documentation      | `research`, `writing-for-agents`                          |

---

## Required Artifacts

- `feature_list.json` — Implementation status only: every function in it ships.
  Carries `tier` (`T1` / `T2` / `niche` / `extra`) for roadmap order. It holds
  **no** `cut` / `deferred` / `svelte-native` entries.
- `docs/recipes.md` — Source of truth for everything deliberately not ported,
  with the Svelte-native replacement for each. Also the source the Astro
  migration docs render from, so keep one row per VueUse hook.
- `progress.md` — Session log with verifiable checkmarks and status
- `init.sh` / `init.ps1` — Standard baseline verification scripts
- `session-handoff.md` — Context handoff for next agent session
- `.agents/rules/*.md` — Scope, module, docs, test, and workflow contracts
  (`migration-plan.md` was dissolved into these; do not recreate it)

---

## Definition of Done

A utility is done only when:

- [ ] Implementation is complete and faithfully reproduces the VueUse utility behavior in Svelte 5
- [ ] Safe for SSR (`typeof window !== 'undefined'` checks in place)
- [ ] No module-scope mutable state in `src/lib/**/*.svelte.ts` (see `scope.md` §2)
- [ ] All event listeners, observers, and timers are cleaned up on disposal
- [ ] Public options and return interfaces are exported from its module and `src/lib/index.ts`
- [ ] Barrel export resolves — a symbol exported from two paths is dropped silently (see `batch-workflow.md` §5)
- [ ] Docs: `src/lib/<category>/<name>/README.md` per `docs-contract.md` + JSDoc with `@example` on every exported function (each overload too); no file-top banner comments — documentation lives on exports, not file headers
- [ ] Tests: `src/lib/<category>/<name>/<name>.test.ts` per `test-contract.md`, `bun run test` green, no uncovered public export
- [ ] `bun run check` passes with 0 errors and 0 warnings
- [ ] `bun run format` passes with 0 errors
- [ ] `bun run lint` passes with 0 errors
- [ ] `bun run prepack` builds dist and passes `publint` with 0 errors
- [ ] Evidence recorded in `feature_list.json` and `progress.md`

---

## End of Session Routine

1. Run verification (`.\init.ps1` or `./init.sh`).
2. Mark completed features in `feature_list.json`.
3. Log changes and remaining questions in `progress.md`.
4. Update `session-handoff.md` with immediate next steps.
