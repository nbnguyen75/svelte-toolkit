# AGENTS.md

Project harness for reliable agent-assisted development on
**`@wynn-dev/svelte-use-integrations`** (TypeScript + Svelte 5 adapter library,
Bun-managed). Self-contained module: own rules, skills, roadmap, and state —
nothing is shared with or tracked in the sibling `@wynn-dev/svelte-use` package
except the documented dependency direction (this package may depend on core;
core never depends back).

`@wynn-dev/svelte-use-integrations` is a collection of thin Svelte 5 adapters
over third-party libraries, mirroring `vueuse/integrations` using modern Runes.

---

## Repository Layout

- This package root (`packages/svelte-use-integrations/`) — the publishable library (`src/lib`, `prepack`/`publint`) and its self-contained harness (this AGENTS.md, `.agents/`, `.claude/`, `init.*`, `feature_list.json`, `skills-lock.json`, `eslint`/`oxfmt`/`oxlint` configs). Strict relative imports only within `src/lib/`.
- `src/lib/` — flat adapter layout, one directory per third-party wrapper (`src/lib/useAxios/`, `src/lib/useFuse/`, `src/lib/useIDBKeyval/`). No category filing; see `module-contract.md` §2.
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
   - `scope.md` — what belongs here (adapters only), peerDep rules, core-dep direction, naming conventions
   - `utilities-architecture.md` — Svelte 5 runes reactivity, getters/classes, SSR guards, listener cleanups
   - `module-contract.md` — flat adapter layout, barrel/typing rules
   - `docs-contract.md` — per-adapter README contents, JSDoc requirements
   - `test-contract.md` — vitest config facts and the per-adapter test checklist
   - `typescript.md` — strict TypeScript rules, exported interfaces, zero `any`
   - `ponytail.md` — peer-deps-only ladder, zero bloat, YAGNI
   - `batch-workflow.md` — the per-feature loop: research → implement → test → verify → evidence
   - `phase-gate.md` — done criteria: implementation + verification + evidence
   - `improve.md` — quality and architecture standards
4. **Run `.\init.ps1`** (or `./init.sh` on bash) to verify environment health
5. **Read `feature_list.json`** to see roadmap status and identify the next adapter to port
6. **Review recent commits** with `git log --oneline -5`

If baseline verification fails, repair it before adding new scope.

---

## Standard Package Commands

Always use the standard npm/bun scripts configured in `package.json` for validation and formatting:

| Command                    | Action                         | Underlying Tool                  |
| -------------------------- | ------------------------------ | -------------------------------- |
| `bun run check`            | Typecheck components & modules | `svelte-check`                   |
| `bun run check:watch`      | Watch mode typecheck           | `svelte-check --watch`           |
| `bun run format`           | Verify formatting compliance   | `oxfmt --check`                  |
| `bun run format:fix`       | Format codebase automatically  | `oxfmt`                          |
| `bun run lint`             | Lint codebase for errors       | `oxlint && eslint .`             |
| `bun run lint:fix`         | Autofix lint issues            | `oxlint --fix && eslint . --fix` |
| `bun run prepack`          | Package verification & build   | `svelte-package && publint`      |
| `bun run test`             | Unit tests                     | `vitest run`                     |
| `.\init.ps1` / `./init.sh` | Full baseline environment run  | All gates, incl. path-leak scan  |

---

## Working Rules

- **One feature at a time**: Pick exactly one feature from `feature_list.json` and work its adapters.
- **Adapters only, peerDeps only**: every third-party lib is an optional peerDependency — never bundled, never a regular dep. Svelte stays a peer. See `scope.md` §1.
- **Core dep allowed one way**: this package may add `"@wynn-dev/svelte-use": "workspace:*"` when an adapter reuses core utils; core never depends back.
- **Svelte 5 Runes Only**: Use `$state`, `$derived`, `$derived.by`, `$effect`, `$bindable`.
- **Reactive Return Values**: Expose reactive state via getter properties (`get value() { return state; }`) or state classes so destructuring doesn't lose reactivity.
- **SSR & Browser Guards**: Every DOM/browser API access must check `typeof window !== 'undefined'` or run safely inside `$effect`.
- **No Module-Scope Mutable State**: Module scope is for immutable constants only — server modules are shared across requests. See `scope.md` §2.
- **Zero Memory Leaks**: Always return cleanup functions or provide `.stop()` / `.cleanup()` methods for event listeners, observers, and timers.
- **Strict TypeScript**: Export options and return types for each adapter from its module folder (`index.ts`). No `any`, no `@ts-ignore`.
- **Relative Imports Inside `src/lib/`**: Never use `$lib` path aliases inside `src/lib/` — `svelte-package` does not rewrite aliases in `.d.ts` / `.js` files.
- **Formatting & Linting First**: Use `bun run format:fix` and `bun run lint:fix` during editing.
- **Verification Required**: Never claim a task is complete without running `.\init.ps1` (or `bun run check && bun run format && bun run lint && bun run test && bun run prepack`).
- **Never Commit Absolute Paths**: Reference an external checkout as `$VUEUSE_SRC` or a repo-relative path. Gate 6 enforces it.
- **Update Artifacts**: Update `feature_list.json` and `progress.md` at each milestone. State lives here — never in the sibling package.

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

- `feature_list.json` — Source of truth for roadmap and adapter completion (this package only)
- `progress.md` — Session log with verifiable checkmarks and status
- `init.sh` / `init.ps1` — Standard baseline verification scripts
- `session-handoff.md` — Context handoff for next agent session
- `.agents/rules/*.md` — Scope, module, docs, test, and workflow contracts

---

## Definition of Done

An adapter is done only when:

- [ ] Implementation is complete and faithfully reproduces the VueUse utility behavior in Svelte 5
- [ ] Underlying third-party lib is an optional peerDependency (user installs it), never bundled
- [ ] Safe for SSR (`typeof window !== 'undefined'` checks in place)
- [ ] No module-scope mutable state in `src/lib/**/*.svelte.ts` (see `scope.md` §2)
- [ ] All event listeners, observers, and timers are cleaned up on disposal
- [ ] Public options and return interfaces are exported from its module and `src/lib/index.ts`
- [ ] Barrel export resolves — a symbol exported from two paths is dropped silently (see `batch-workflow.md` §5)
- [ ] Docs: `src/lib/<name>/README.md` per `docs-contract.md` + JSDoc with `@example` on every exported function (each overload too); no file-top banner comments — documentation lives on exports, not file headers
- [ ] Tests: `src/lib/<name>/<name>.test.ts` per `test-contract.md`, `bun run test` green, no uncovered public export
- [ ] `bun run check` passes with 0 errors and 0 warnings
- [ ] `bun run format` passes with 0 errors
- [ ] `bun run lint` passes with 0 errors
- [ ] `bun run prepack` builds dist and passes `publint` with 0 errors
- [ ] Evidence recorded in `feature_list.json` and `progress.md`

---

## End of Session Routine

1. Run verification (`.\init.ps1` or `./init.sh`).
2. Mark completed adapters in `feature_list.json`.
3. Log changes and remaining questions in `progress.md`.
4. Update `session-handoff.md` with immediate next steps.
