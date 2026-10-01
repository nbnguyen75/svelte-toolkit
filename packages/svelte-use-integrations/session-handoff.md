# Session Handoff — svelte-use-integrations

## Current State

- Harness and tooling configured in `packages/svelte-use-integrations/` (see `progress.md`).
- `src/lib/` contains only the template `index.ts`; no adapters ported yet.
- `feature_list.json` v1.0.0 is this package's own work queue (feat-030). Core ports are tracked exclusively in the sibling package — never mix state.

## Blockers

- None — baseline verification not run yet in this repo.

## Files

- `packages/svelte-use-integrations/AGENTS.md` — canonical harness for this package.
- `packages/svelte-use-integrations/feature_list.json` — roadmap and work queue.
- `packages/svelte-use-integrations/progress.md` — session log.

## Next Session

- **Last Updated**: 2026-10-01
- **Current Objective**: baseline verification, then first adapter port.
- **Recommended Next Step**: run `.\init.ps1` (or `./init.sh`) from `packages/svelte-use-integrations/`.

## How to Resume

1. Read `packages/svelte-use-integrations/AGENTS.md` and its `.agents/rules/`.
2. Run `.\init.ps1` to ensure all gates pass.
3. Check `feature_list.json` for the next unfinished adapter.
