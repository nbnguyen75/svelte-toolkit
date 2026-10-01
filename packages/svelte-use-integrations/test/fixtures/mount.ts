/**
 * Shared mount harness for `$effect`-based utils under test.
 * Complements `run.svelte` (which runs setup untracked inside `$effect`).
 * Test-only: never imported by library code, never packaged.
 */
import { mount, tick, unmount } from 'svelte';

import Run from './run.svelte';

/** Mount `setup` in an isolated host; `dispose` unmounts and cleans up. */
export async function mountSetup(setup: () => void | (() => void)): Promise<{
	dispose: () => Promise<void>;
}> {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const app = mount(Run, { props: { setup }, target });
	await tick();
	return {
		async dispose() {
			unmount(app);
			await tick();
			target.remove();
		}
	};
}

/** Mount a util factory and capture its return value. */
export async function mountUtil<T>(create: () => T): Promise<{
	api: T;
	dispose: () => Promise<void>;
}> {
	let api: T | undefined;
	const { dispose } = await mountSetup(() => {
		api = create();
	});
	if (api === undefined) throw new Error('setup did not produce an API');
	return { api, dispose };
}
