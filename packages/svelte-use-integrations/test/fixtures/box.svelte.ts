/**
 * Minimal reactive box fixture: lets plain `.test.ts` files (no runes)
 * drive reactive sources for `$effect`-based utils under test.
 */
export function createBox<T>(initial: T) {
	let current = $state(initial);

	return {
		get value() {
			return current;
		},
		set value(next: T) {
			current = next;
		}
	};
}
