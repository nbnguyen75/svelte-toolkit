# Batch Workflow — `@wynn-dev/svelte-use-integrations`

How a feature batch actually gets done. One feature at a time; no
speculative adjacent work.

## 1. Select

- Pick **exactly one** feature from `feature_list.json` (feat-NNN).
- Read its `functions` list and decide each entry's `status`:
  `todo` → `done`, or `todo` → `cut` / `deferred` / `svelte-native` with a
  reason in [`docs/recipes.md`](../../docs/recipes.md).
- Apply the yardstick in [scope.md](scope.md) §3 before writing any
  implementation. Most "we should port this" items are 1–3 line
  `$derived`/`$effect` compositions and become recipes instead.
- **Non-trivial batches** (integrations, SSR-unsafe APIs, anything with 8+
  functions) get an implementation plan from the `improve` skill first. Do not
  improvise a large batch — `improve` is read-only and produces the plan.
- `feature_list.json` stays a **status index**, not a work log. It records what
  was decided and the evidence; it does not hold recipes or implementation
  detail.

## 2. Research

- Read the VueUse source for the batch (resolve via `$VUEUSE_SRC`, then
  `../../vueuse/packages` — see [module-contract.md](module-contract.md) §5).
  VueUse is the behavior spec, including its quirks.
- Check what Svelte 5 already ships before implementing —
  [scope.md](scope.md) §5. If a primitive covers it, build on it.
- Load `vue-to-svelte-analyze`, then `vue-to-svelte-port`. For Svelte 5
  reactivity questions load `svelte-core-bestpractices`.

## 3. Implement

- `bun run format:fix` and `bun run lint:fix` as you go.
- One util per directory, per [module-contract.md](module-contract.md).
- JSDoc + `@example` on every export, including overloads.
- No module-scope mutable state ([scope.md](scope.md) §2).
- Never suppress a type error ([typescript.md](typescript.md)).

## 4. Test

Per [test-contract.md](test-contract.md): happy path, defaults, reactivity,
cleanup, SSR fallback. `node` environment unless the API is inherently DOM.

## 5. Verify the Public Surface

`export *` hides ambiguity drops — a symbol exported from two paths vanishes
without a warning. After adding to the barrel, confirm the export resolves:

```ts
import { useNewThing, type UseNewThingReturn } from '../src/lib/index.js';
```

A throw here is the only signal you get. feat-022 lost a commit cycle to
exactly this: `UseObjectUrlReturn` existed as a type in its module but was
never re-exported, and no test imported it from the barrel.

## 6. Gate & Evidence

Full suite — [phase-gate.md](phase-gate.md) is authoritative:

```sh
bun run format:fix
bun run lint:fix
bun run check
bun run test
bun run prepack
```

Then record evidence — a util is **not** done without all of it:

- [ ] Implementation matches VueUse behavior; divergences documented
- [ ] SSR-safe (`typeof window !== 'undefined'` or inside `$effect`)
- [ ] All listeners/observers/timers cleaned up
- [ ] Options + return interfaces exported from the module **and** `src/lib/index.ts`
- [ ] `README.md` (per [docs-contract.md](docs-contract.md)) + JSDoc `@example` on every export
- [ ] Colocated `<name>.test.ts`; `bun run test` green; no uncovered public export
- [ ] `bun run check` 0 errors / 0 warnings
- [ ] `bun run format` 0 errors
- [ ] `bun run lint` 0 errors
- [ ] `bun run prepack` builds dist and passes `publint`
- [ ] Gate output pasted into `progress.md`
- [ ] `feature_list.json` updated with status + evidence

## 7. Commit & Hand Off

- One commit per meaningful step (`feat-NNN`, `refactor`, `docs`, `test`).
  Conventional Commits; no `any` in the diff — including the tests.
- Run `bun run format:fix`, `bun run lint:fix` and `bun run check` before committing.
- Update `progress.md` with what shipped and what remains, and
  `session-handoff.md` with the next concrete step.
- Never commit without being asked.