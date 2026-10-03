/**
 * Pure helpers, no DOM: called directly, no compiler or mount needed
 * (module-contract.md §1 — pure logic stays in a runes-free file so it is
 * testable that way).
 */
import { describe, expect, it } from 'vitest';

import { increaseWithUnit, pxValue } from './units.ts';

describe('increaseWithUnit', () => {
	it('adds to a unit-less number and stays a number', () => {
		expect(increaseWithUnit(100, 1)).toBe(101);
	});

	it('preserves a px unit', () => {
		expect(increaseWithUnit('1px', 1)).toBe('2px');
	});

	it('crosses zero while keeping a negative sign on the unit', () => {
		expect(increaseWithUnit('-1em', 1)).toBe('0em');
		expect(increaseWithUnit('1em', -1)).toBe('0em');
	});

	it('goes negative past the start of the value', () => {
		expect(increaseWithUnit('1em', -5)).toBe('-4em');
	});

	it('adds a decimal delta to a fractional value', () => {
		expect(increaseWithUnit('0.5vw', 1.5)).toBe('2vw');
	});

	it('keeps a space between value and unit', () => {
		expect(increaseWithUnit('100 %', 10)).toBe('110 %');
	});

	it('returns a value with no leading number unchanged', () => {
		expect(increaseWithUnit('var(--cool)', -5)).toBe('var(--cool)');
		expect(increaseWithUnit('', 1)).toBe('');
	});
});

describe('pxValue', () => {
	it('parses px', () => {
		expect(pxValue('640px')).toBe(640);
	});

	it('resolves rem at an assumed 16px', () => {
		expect(pxValue('40rem')).toBe(640);
	});

	it('parses a fractional value', () => {
		expect(pxValue('22.5px')).toBe(22.5);
	});

	it('is NaN when there is no leading number', () => {
		expect(pxValue('var(--x)')).toBeNaN();
	});
});
