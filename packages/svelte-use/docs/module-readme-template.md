# `<name>` — template for per-module READMEs

> Copy this file to `src/lib/<category>/<name>/README.md` and fill every
> section. Delete these instructions. See `.agents/rules/docs-contract.md`.

One-line purpose. Ported from [VueUse `<source>`](https://vueuse.org/<path>)
— or label `custom (no VueUse equivalent)`.

## Signature

```ts
import {} from /* fn */ '@wynn-dev/svelte-use';

const result = fn(arg, {/* options */});
```

## Options

| Option    | Type      | Default | Description   |
| --------- | --------- | ------- | ------------- |
| `example` | `boolean` | `false` | What it does. |

State every default. `MaybeGetter<T>` inputs accept a plain value or a
`() => value` getter.

## Returns

| Field    | Type         | Reactive | Description                       |
| -------- | ------------ | -------- | --------------------------------- |
| `value`  | `boolean`    | getter   | Current state (destructure-safe). |
| `toggle` | `() => void` | method   | Flips the state.                  |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import {} from /* fn */ '@wynn-dev/svelte-use';
	const state = fn();
</script>

<button onclick={() => state.toggle()}>Toggle</button>
```

### SSR behavior

What renders on the server (fallback values), what hydrates on the client.
Must work with or without SvelteKit (no `$app/*` imports).

## Edge cases & cleanup

- Timers/listeners/observers: what is disposed automatically via `$effect`,
  what needs `cancel()` / `stop()` / `flush()`.
- Unmount mid-flight: no stale writes.
- Unsupported APIs: safe no-ops (e.g. missing clipboard, denied permission).

## VueUse parity notes

List intentional divergences (e.g. `MaybeGetter<T>` instead of Vue's
`MaybeRefOrGetter`; no promise rejection on cancel). Link the VueUse source
file analyzed: `vueuse/packages/<pkg>/<fn>/index.ts`.
