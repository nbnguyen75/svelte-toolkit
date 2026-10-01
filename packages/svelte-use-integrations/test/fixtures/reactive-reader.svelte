<script lang="ts">
	/**
	 * Mount fixture that reads a util's value inside `$effect`, mirroring a
	 * template read.
	 *
	 * Required for utils built on Svelte's lazy `createSubscriber` primitives
	 * (`svelte/reactivity`, `svelte/reactivity/window`): those subscribe only
	 * while a value is read *inside a reaction*. A test body is not a reaction,
	 * so both the subscription and its release on unmount are unobservable
	 * without this fixture. Utils built on `$effect` internally need no such
	 * helper — they subscribe on construction.
	 */
	import { untrack } from 'svelte';

	interface ReactiveReaderProps {
		/** Called synchronously inside the effect; read `.value` here. */
		observe: (api: unknown) => void;
		/** Create the util under test (untracked, as component init would be). */
		setup: () => unknown;
	}

	const { setup, observe }: ReactiveReaderProps = $props();

	$effect(() => {
		observe(untrack(setup));
	});
</script>

<span>reactive-reader</span>
