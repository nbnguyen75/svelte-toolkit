# Ponytail & Simplification Rules — @wynn-dev/svelte-use-integrations

Strict rule: `ponytail` (minimalist, zero-bloat, simplest solution) and `ponytail-review` (over-engineering review) are enforced across all tasks.

## 1. The Simplification Ladder
Always stop at the first rung that holds:
1. **YAGNI**: If it's a speculative feature, skip it. Don't add config options or props until a primitive actually requires them.
2. **Reuse**: Check if an internal utility (e.g., id generation, context helper, keyboard handler) already exists in `src/lib/` before writing new code.
3. **Standard Library / Native**: Use browser native primitives and WAI-ARIA standards before pulling third-party micro-libraries.
4. **Peer Dependencies Only**: This package exists to wrap third-party libraries, so each underlying lib is an **optional peerDependency — never bundled, never a regular dep.** Reuse core (`@wynn-dev/svelte-use`, `workspace:*` when needed) and Svelte 5 runes / `svelte/reactivity` primitives rather than adding new third-party helpers. See [scope.md](scope.md) §1.
5. **Minimal Working Code**: Write the shortest, clearest diff that provides complete accessibility, keyboard navigation, and unstyled functionality.

## 2. Review for Over-Engineering (`ponytail-review`)
- Before completing tasks, review changes specifically to eliminate unnecessary abstractions, complex nested contexts, premature factory functions, or dead wrapper components.
