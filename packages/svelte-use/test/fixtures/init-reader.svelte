<script lang="ts">
	/**
	 * Mount fixture where the util is created during component *init* and read by
	 * a *separate* `$effect`, which is how a component actually uses one.
	 *
	 * `reactive-reader.svelte` differs deliberately: it calls `setup()` inside
	 * the reading effect, so the util's state is created *within* the reaction
	 * that observes it. That suits `createSubscriber`-based utils, whose state
	 * must be created before the first read, but it is not representative for a
	 * util that owns its own state (`useMagicKeys`, for one). Use this fixture
	 * whenever the thing under test builds its own reactive state.
	 */
	import { untrack } from 'svelte';

	interface InitReaderProps {
		/** Create the util under test, during init, as a component would. */
		setup: () => unknown;
		/** Called from the reading effect; read the API here. */
		observe: (api: unknown) => void;
	}

	const { setup, observe }: InitReaderProps = $props();

	// Component init: not inside a reaction, exactly like calling the util at the
	// top level of a `<script>` block. Wrapped in a closure because the props
	// reference is deliberately one-shot.
	const api = untrack(() => setup());

	$effect(() => {
		observe(api);
	});
</script>

<span>init-reader</span>
