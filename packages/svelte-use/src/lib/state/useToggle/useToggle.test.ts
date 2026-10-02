import { describe, expect, it } from 'vitest';

import { useToggle } from './index.ts';

describe('useToggle', () => {
	it('defaults to false and flips', () => {
		const toggle = useToggle();

		expect(toggle.value).toBe(false);
		expect(toggle.toggle()).toBe(true);
		expect(toggle.value).toBe(true);
		expect(toggle.toggle()).toBe(false);
	});

	it('honours an initial value and getter', () => {
		expect(useToggle(true).value).toBe(true);
		expect(useToggle(() => true).value).toBe(true);

		let current = true;
		expect(useToggle(() => current).value).toBe(true);
		current = false;
		expect(useToggle(() => current).value).toBe(false);
	});

	it('reads live state through the getter', () => {
		const toggle = useToggle();

		toggle.value = true;
		expect(toggle.value).toBe(true);
		expect(toggle.toggle()).toBe(false);
	});

	it('sets an explicit value instead of flipping', () => {
		const toggle = useToggle();

		expect(toggle.toggle(true)).toBe(true);
		expect(toggle.value).toBe(true);
		expect(toggle.toggle(false)).toBe(false);
	});

	it('treats an explicit undefined as a set, not a flip', () => {
		const toggle = useToggle<string | undefined>('a', {
			truthyValue: 'a',
			falsyValue: undefined
		});

		expect(toggle.value).toBe('a');
		expect(toggle.toggle()).toBeUndefined();
		expect(toggle.toggle()).toBe('a');
		// Explicit undefined keeps landing on the falsy value.
		expect(toggle.toggle(undefined)).toBeUndefined();
	});

	it('cycles two custom values and wraps with Object.is', () => {
		const toggle = useToggle<'on' | 'off', ''>('on', {
			truthyValue: 'on',
			falsyValue: ''
		});

		expect(toggle.value).toBe('on');
		expect(toggle.toggle()).toBe('');
		expect(toggle.toggle()).toBe('on');
	});

	it('resolves getter options once at construction', () => {
		let truthy = 'yes';
		const toggle = useToggle<'yes' | 'no', ''>('no', {
			truthyValue: () => truthy,
			falsyValue: ''
		});

		expect(toggle.toggle()).toBe('yes');
		// The truthy value is captured at setup, like VueUse, so a later change
		// to the getter is not observed.
		truthy = 'y';
		expect(toggle.toggle()).toBe('');
		expect(toggle.toggle()).toBe('yes');
	});

	it('handles NaN state because it compares with Object.is', () => {
		const toggle = useToggle<number, number>(Number.NaN, {
			truthyValue: Number.NaN,
			falsyValue: 0
		});

		// Object.is(NaN, NaN) is true, so this toggles to the falsy value.
		expect(toggle.toggle()).toBe(0);
	});

	it('keeps instances distinct and stays destructure-safe', () => {
		const first = useToggle(true);
		const second = useToggle(false);

		first.toggle();

		expect(first.value).toBe(false);
		expect(second.value).toBe(false);
	});
});
