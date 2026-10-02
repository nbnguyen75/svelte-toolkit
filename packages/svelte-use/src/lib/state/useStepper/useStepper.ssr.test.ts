/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `useStepper` reads its steps synchronously, so navigation state must be
 * readable without a DOM.
 */
import { describe, expect, it } from 'vitest';

import { useStepper } from './index.ts';

describe('useStepper (ssr)', () => {
	it('exposes step state without a DOM', () => {
		const stepper = useStepper(['a', 'b', 'c'], 'b');

		expect(stepper.current).toBe('b');
		expect(stepper.isFirst).toBe(false);
		expect(stepper.next).toBe('c');

		stepper.goToNext();
		expect(stepper.current).toBe('c');
		expect(stepper.isLast).toBe(true);
	});

	it('supports record steps without a DOM', () => {
		const stepper = useStepper({ intro: 'Intro', done: 'Done' });

		expect(stepper.stepNames).toEqual(['intro', 'done']);
		expect(stepper.current).toBe('Intro');
	});
});
