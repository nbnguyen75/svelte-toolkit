#!/usr/bin/env bash
set -e

echo "=== svelte-use-integrations Harness Initialization & Verification ==="

echo ">> Checking dependencies..."
bun install

echo ">> Running typecheck (svelte-check)..."
bun run check

echo ">> Running format check (oxfmt)..."
bun run format

echo ">> Running linter (oxlint & eslint)..."
bun run lint

echo ">> Running unit tests (vitest)..."
bun run test

echo ">> Testing library packaging (prepack)..."
bun run prepack

# Canonical path-leak pattern. Kept here (not in a scanned .md file) so the gate
# cannot match its own definition. Needs PCRE + lookbehind: a bare "letter,
# colon, separator" shape also matches the tail of any URL scheme.
# See .agents/rules/phase-gate.md §3.
echo ">> Scanning for machine-specific absolute paths..."
if leaks=$(git grep -nP '(?<![\w:/])[A-Za-z]:[/\\]|(?<!\w)/(?:home|Users)/[^/\s]+/' -- '*.md' '*.ts' '*.js' '*.json' '*.svelte'); then
	printf '%s\n' "$leaks" >&2
	echo "Path-leak gate failed: machine-specific absolute path(s) in tracked files" >&2
	exit 1
fi
echo "   no leaks found"

echo "=== All Checks Passed Successfully ==="
