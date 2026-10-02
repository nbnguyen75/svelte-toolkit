import { describe, expect, it } from 'vitest';

import { useCounter } from './index.ts';

describe('useCounter', () => {
	it('starts at 0 by default', () => {
		expect(useCounter().count).toBe(0);
	});

	it('accepts a value or a getter', () => {
		expect(useCounter(5).count).toBe(5);
		expect(useCounter(() => 7).count).toBe(7);
	});

	it('increments and decrements by one by default', () => {
		const counter = useCounter(0);

		counter.inc();
		expect(counter.count).toBe(1);
		counter.inc(4);
		expect(counter.count).toBe(5);
		counter.dec();
		expect(counter.count).toBe(4);
		counter.dec(3);
		expect(counter.count).toBe(1);
	});

	it('clamps to min and max', () => {
		const counter = useCounter(5, { min: 0, max: 10 });

		counter.inc(100);
		expect(counter.count).toBe(10);
		counter.dec(100);
		expect(counter.count).toBe(0);
		counter.set(50);
		expect(counter.count).toBe(10);
	});

	it('does not clamp the initial value', () => {
		expect(useCounter(50, { max: 10 }).count).toBe(50);
	});

	it('resets to the initial value', () => {
		const counter = useCounter(2);

		counter.inc(5);
		counter.reset();
		expect(counter.count).toBe(2);
	});

	it('clamps the reset value and redefines the reset target', () => {
		const counter = useCounter(0, { max: 5 });

		counter.reset(50);
		expect(counter.count).toBe(5);
		counter.inc(100);
		counter.reset();
		expect(counter.count).toBe(5);
	});

	it('exposes get() reading live state', () => {
		const counter = useCounter(1);

		expect(counter.get()).toBe(1);
		counter.inc();
		expect(counter.get()).toBe(2);
	});

	it('keeps instances independent', () => {
		const first = useCounter(0);
		const second = useCounter(0);

		first.inc();

		expect(first.count).toBe(1);
		expect(second.count).toBe(0);
	});
});
