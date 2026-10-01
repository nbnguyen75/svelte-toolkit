# Phase Gate & Quality Gates — @wynn-dev/svelte-use

A utility or feature is complete only when implementation, verification, and
evidence all exist. Claiming "done" before `bun run test` is green is a
harness failure, not a shortcut.

## 1. Single Active Focus

- Pick exactly ONE feature or utility from `feature_list.json` at a time.
- Do not jump ahead or implement unrequested features in parallel without
  explicit user instructions.
- Non-trivial batches get an `improve` plan first — see
  [batch-workflow.md](batch-workflow.md) §1.

## 2. Gate Verification Requirements

Before marking anything `done`, all six gates must pass. This is the exact
sequence `init.ps1` / `init.sh` run:

| # | Gate | Command | Passes when |
| --- | --- | --- | --- |
| 1 | Typecheck | `bun run check` | 0 errors **and** 0 warnings |
| 2 | Format | `bun run format` | 0 errors (`oxfmt --check`) |
| 3 | Lint | `bun run lint` | 0 errors (`oxlint` then `eslint src --ext .svelte`) |
| 4 | Test | `bun run test` | full suite green, no skipped tests |
| 5 | Packaging | `bun run prepack` | `svelte-package` builds dist, `publint` reports 0 errors |
| 6 | Path leak | see §3 | no machine-specific path in tracked text |

Do not substitute bare `tsc` for gate 1 — it does not resolve the Svelte
barrel and reports errors that `svelte-check` does not.

Current baseline to protect: **590 tests across 118 files.**

## 3. Path-Leak Gate

Tracked files must not contain a machine-specific absolute path. It leaks
personal data, and it goes stale for everyone else.

The canonical pattern and its scan list live in exactly one place per script —
`init.ps1` and `init.sh` — because those files are not themselves scanned.
Run `.\init.ps1` (or `./init.sh`) to enforce it; do not paste the pattern into
scanned files.

Two non-obvious requirements, both learned the hard way:

1. **PCRE and a negative lookbehind are mandatory.** A drive letter plus colon
   plus separator is *not* specific enough on its own — the trailing two
   characters of any URL scheme produce the same shape, so a naive pattern
   flags roughly 300 lines across this repo. The lookbehind rejects a letter
   preceded by a word character, colon, or separator, which is precisely the
   context a URL scheme creates.
2. **Never inline the pattern in a scanned file, and never illustrate it with a
   backticked lone letter before a scheme separator.** This very rule file is
   scanned, and an earlier draft of this section failed its own gate twice —
   once from the embedded pattern, once from an example scheme written inside
   inline code where the scheme's letter sat directly against the backtick.

When editing this file, re-run the gate. Reference an external checkout
symbolically instead (`$VUEUSE_SRC`, or a repo-relative path) — see
[module-contract.md](module-contract.md) §5.

## 4. Conditional Gates

These apply only when the change touches the relevant surface:

- **Svelte components / `.svelte.ts`** — validate with the `svelte-autofixer`
  tool or `svelte-core-bestpractices`. This package ships no components (only
  `test/fixtures/*.svelte`), so this gate is usually vacuous.
- **Interactive demo** — only when a runnable playground exists. There is
  currently **no** `src/routes/` demo app in this package; `docs/` is an
  Astro + Starlight site driven by the per-util READMEs, not a component
  gallery. Do not invent a demo route to satisfy this gate — a documented
  example plus a passing test is the evidence.