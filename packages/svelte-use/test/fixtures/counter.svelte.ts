/**
 * Minimal runes fixture proving `.svelte.ts` modules (the `$state` /
 * `$derived` + getter-object pattern every state util follows) compile
 * and run under vitest in a DOM-less node environment.
 */
export function createCounter(initial = 0) {
	let count = $state(initial);
	const doubled = $derived(count * 2);

	return {
		get count() {
			return count;
		},
		get doubled() {
			return doubled;
		},
		increment(step = 1) {
			count += step;
		},
		reset() {
			count = initial;
		}
	};
}
