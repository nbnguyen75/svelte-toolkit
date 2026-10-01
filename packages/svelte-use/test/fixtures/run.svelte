<script lang="ts">
	/**
	 * Generic mount harness for testing `$effect`-based utils: the `setup`
	 * callback runs inside `$effect` on mount, and its return value (a
	 * cleanup function or nothing) becomes the effect cleanup — so
	 * `unmount` exercises the util's disposal path.
	 *
	 * `setup` runs `untrack`ed so utils that sample reactive sources at
	 * construction (like component init does) don't re-trigger setup
	 * itself when those sources change — only the util's own inner
	 * effects re-run.
	 */
	import { untrack } from 'svelte';

	interface RunProps {
		setup: () => void | (() => void);
	}

	const { setup }: RunProps = $props();

	$effect(() => untrack(() => setup()));
</script>
