#!/usr/bin/env bash
set -e

echo "=== svelte-use Harness Initialization & Verification ==="

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

# publint and svelte-check both pass on declarations a consumer cannot compile:
# publint never resolves types, and svelte-check reads the source, not the
# emitted .d.ts. Two failures reached a release that way - `useCloned` shipped a
# `.d.ts` naming `$state` (TS2304 for every consumer) and, in an earlier
# revision, silently emitted no `.d.ts` at all (TS7056). Gate the artifact.
echo ">> Typechecking a consumer against dist..."
bun x tsc --noEmit --ignoreConfig --strict --skipLibCheck false \
	--moduleResolution bundler --module esnext --target es2022 --lib es2022,dom \
	test/dist-consumer-probe.ts

# Runes are in scope only inside a .svelte.ts processed by svelte2tsx. Reaching
# a published .d.ts means a consumer gets TS2304. Doc comments are stripped
# first so prose mentioning `$state.snapshot` does not trip the gate.
echo ">> Scanning emitted declarations for rune identifiers..."
leaked_runes=$(grep -rlE '\$(state|derived|effect|props|bindable|inspect)\b' dist --include='*.d.ts' | while read -r file; do
	# strip block and line comments before matching
	sed -e '/\/\*/,/\*\//d' -e '/^[[:space:]]*\/\//d' "$file" | grep -qE '\$(state|derived|effect|props|bindable|inspect)\b' && echo "$file"
done)
if [ -n "$leaked_runes" ]; then
	echo "$leaked_runes" >&2
	echo "Declaration gate failed: rune identifier(s) in published .d.ts" >&2
	exit 1
fi
echo "   no rune leaks found"

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
