# Ponytail & Simplification Rules — @wynn-dev/svelte-use

Strict rule: `ponytail` (minimalist, zero-bloat, simplest solution) and `ponytail-review` (over-engineering review) are enforced across all tasks.

## 1. The Simplification Ladder
Always stop at the first rung that holds:
1. **YAGNI**: If it's a speculative feature, skip it. Don't add config options or props until a primitive actually requires them.
2. **Reuse**: Check if an internal utility (e.g., id generation, context helper, keyboard handler) already exists in `src/lib/` before writing new code.
3. **Standard Library / Native**: Use browser native primitives and WAI-ARIA standards before pulling third-party micro-libraries.
4. **Zero Runtime Dependencies**: This is a utility library, so the rule is absolute — **Svelte is the only peer, and there are no exceptions.** Use Svelte 5 built-in runes, `svelte/reactivity` primitives, and DOM APIs rather than third-party micro-libraries. (A prior version of this file granted a standing `@floating-ui/dom` exception. It was inherited from an unrelated headless-primitive project, has never applied here, and is removed.) Third-party deps are what `@wynn-dev/svelte-use-integrations` exists for — see [scope.md](scope.md) §4.
5. **Minimal Working Code**: Write the shortest, clearest diff that provides complete accessibility, keyboard navigation, and unstyled functionality.

## 2. Review for Over-Engineering (`ponytail-review`)
- Before completing tasks, review changes specifically to eliminate unnecessary abstractions, complex nested contexts, premature factory functions, or dead wrapper components.
