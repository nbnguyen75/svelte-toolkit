# Test Contract — `@wynn-dev/svelte-use-integrations`

Suites live next to the module at
`src/lib/<category>/<name>/<name>.test.ts`.

## 1. Verified Baseline

`vitest.config.ts` — the config that makes this contract true:

| Setting | Value | Why it matters |
| --- | --- | --- |
| `environment` | `'node'` | **isomorphic default — no DOM globals.** A suite needing DOM opts in per file. |
| `server.deps.inline` | `['svelte']` | bare `svelte` imports resolve to the client build; otherwise `mount()` throws under SSR resolution. |
| `resolve.conditions` | `['browser', 'module', 'node', …]` | dual-build deps pick client builds in every pipeline. |
| `runes` | forced `true` for first-party code | plain `.ts` files compile in runes mode. |
| `restoreMocks` | `true` | mocks auto-restore between tests. |
| `setupFiles` | `./test/setup.ts` | `matchMedia` stub + `setMediaMatches()`, timer/registry reset after each test. |

Opt into a DOM per file with a first-line pragma:

```ts
// @vitest-environment jsdom
```

Default to `node`. Reaching for `jsdom` because a test is *easier* there hides
SSR regressions — the node default is what catches unguarded browser access.

## 2. Minimum Checklist Per Util

Cover **all cases as possible**:

- [ ] **Every public export imported and exercised** — no dead exports.
- [ ] **Options** — each option's documented default, plus its non-default
      behavior. Defaults in JSDoc and README are contractual; a test is the only
      thing that keeps them honest.
- [ ] **Reactivity** — a `mount()`ed component; change the underlying signal;
      `await tick()`; assert the getter-backed return updated.
- [ ] **Timing** — `vi.useFakeTimers()` + `vi.advanceTimersByTime(n)`; async
      via `flushPromises`. Never sleep in real time.
- [ ] **Browser APIs** — jsdom + mocks (`matchMedia`, `clipboard`,
      `ResizeObserver`, `IntersectionObserver`). Note the shared `matchMedia`
      stub in `test/setup.ts` is driven by `setMediaMatches()`.
- [ ] **SSR fallback** — import and call in a `node`-environment file (no
      `window`) and assert the documented defaults.
- [ ] **Cleanup** — `unmount()`, then assert zero listeners/timers/observers
      remain. Spy on `addEventListener`/`removeEventListener`,
      `setTimeout`/`clearTimeout`, or `disconnect`. Unmount **mid-flight** (a
      pending clipboard reset timer, a scroll tween) must leave no stale
      writes.
- [ ] **Controls** — `cancel()`/`flush()`/`stop()`/`pause()`/`resume()`
      semantics, including the uninteresting cases that break: double-cancel,
      flush with nothing pending (must be a no-op, not a throw), cancel-then-reuse.
- [ ] **Errors / unsupported** — an unsupported API is a safe no-op, not a
      throw: `copy()` with no clipboard support, storage quota exceeded, corrupt
      JSON falling back to defaults.
- [ ] **VueUse parity** — port cases from VueUse's own suite where they exist
      (e.g. `packages/shared/utils/index.test.ts` for the array filters).

## 3. Coverage

Pure-logic utils (debounce/throttle/array/math/guards) must be **≥90%
branch-coverable without the Svelte compiler** — which is why that logic lives
in `index.ts` and not in `index.svelte.ts` ([module-contract.md](module-contract.md) §1).

## 4. Testing Rules

- **Runes need `mount`/`unmount`** from `svelte` plus `await tick()`. Pure
  functions in `index.ts` are called directly — no mounting needed.
- **Reactive collections** (`SvelteSet`/`SvelteMap`/runes class fields) trigger
  at microtask boundaries — `await tick()` before asserting.
- **Default to the `node` environment.** Reaching for `jsdom` because a test
  is *easier* there hides SSR regressions — the node default is what catches
  unguarded browser access.
- **`instanceof` is forbidden against DOM globals.** jsdom instances fail it
  across realms; use the guards in `src/lib/shared/is.ts`.
- **One concern per `it`.** Name the behavior, not the function —
  `'fires once even when the callback re-enters'`, not `'calls fn'`.
- **No flaky sleeps, no test-order dependence, no network.** The suite must
  pass offline and in any order.

## 5. Public Surface

- Type-only exports need no runtime test, but must appear in the module's
  `index.ts` and be confirmed by `bun run check`.
- Type exports are verified by *usage*: assign the return to its declared
  `Use*Return` interface (see feat-022's `UseObjectUrlReturn` — a public-surface
  probe caught that one missing).

## 6. Gate

`bun run test` must be green before any util is marked `done`. Current
baseline to protect: **590 tests across 118 files.**