/**
 * Shared mount harness for `$effect`-based utils under test.
 * Complements `run.svelte` (which runs setup untracked inside `$effect`).
 * Test-only: never imported by library code, never packaged.
 */
import { mount, tick, unmount } from 'svelte';

import ReactiveReader from './reactive-reader.svelte';
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

/**
 * Mount a util and read it *inside* `$effect`, via `reactive-reader.svelte`.
 *
 * Required for utils built on Svelte's lazy `createSubscriber` primitives
 * (`MediaQuery` and friends): they only subscribe while a value is read inside
 * a reaction, so reading in a test body proves nothing about reactivity or
 * about listener release on unmount.
 */
export async function mountReactive<T>(
	create: () => T,
	read: (api: T) => void
): Promise<{
	api: T;
	dispose: () => Promise<void>;
}> {
	let api: T | undefined;
	const target = document.createElement('div');
	document.body.appendChild(target);
	const app = mount(ReactiveReader, {
		props: {
			setup: create,
			observe: (value: unknown) => {
				api = value as T;
				read(value as T);
			}
		},
		target
	});
	await tick();
	if (api === undefined) throw new Error('setup did not produce an API');
	return {
		api,
		async dispose() {
			unmount(app);
			await tick();
			target.remove();
		}
	};
}
