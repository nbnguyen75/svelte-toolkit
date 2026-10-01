# Session Handoff — svelte-use

## Current State

- Harness and tooling configured in `packages/svelte-use/` (see `progress.md`).
- `feat-001` (Project Setup & Agent Harness) is `done`: full gate sequence green 2026-10-01.
- Pure library package (no SvelteKit shell). First util shipped: `useScrollToTop`
  (`src/lib/browser/useScrollToTop/`), plus shared `is.ts` / `getter.ts`.
- `feature_list.json` work queue: `cut`/`deferred`/`svelte-native` entries encode
  scope decisions (see `scope.md`, `docs/recipes.md`).

## Immediate Next Task

- Continue feat-002: `useEventListener`, `useDark`, `useClipboard` from
  `sv-utils/packages/src/lib/browser/`, following `.agents/rules/batch-workflow.md`.
  Then feat-005 (blocks the rest), then feat-003/004.

## Harness Notes (learned this session — do not rediscover)

- Svelte's `Tween` reads `performance.now()` internally, so `test/fixtures/raf.ts`
  cannot drive it. Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()`.
- In the `node` test environment `svelte` resolves to its **server** build: runes
  are inert and `$effect.root` never calls back. SSR probes must call the factory
  directly, never inside an effect root or `mount()`.

## How to Resume

1. Read `packages/svelte-use/AGENTS.md` and `packages/svelte-use/.agents/rules/`.
2. Run `.\init.ps1` to ensure all gates pass.
3. Check `feature_list.json` for the next unfinished utility.

## Blockers

- None — baseline verification not run yet in this repo.

## Files

- `packages/svelte-use/AGENTS.md` — canonical harness.
- `packages/svelte-use/feature_list.json` — roadmap and work queue.
- `packages/svelte-use/progress.md` — session log.

## Next Session

- **Last Updated**: 2026-10-01
- **Current Objective**: baseline verification, then first utility port.
- **Recommended Next Step**: run `.\init.ps1` (or `./init.sh`) from `packages/svelte-use/`.
