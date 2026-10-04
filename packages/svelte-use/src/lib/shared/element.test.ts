import { describe, expect, it } from 'vitest';

import { resolveElements } from './element.ts';
import type { MaybeElements } from './element.ts';

describe('resolveElements', () => {
	const a = { nodeName: 'DIV' } as unknown as Element;
	const b = { nodeName: 'SPAN' } as unknown as Element;

	it('wraps a single element', () => {
		expect(resolveElements(a)).toEqual([a]);
	});

	it('reads through a getter', () => {
		expect(resolveElements(() => a)).toEqual([a]);
	});

	it('keeps an array in order', () => {
		expect(resolveElements([a, b])).toEqual([a, b]);
	});

	it('reads an array through a getter', () => {
		expect(resolveElements(() => [a, b])).toEqual([a, b]);
	});

	it('drops nullish entries', () => {
		expect(resolveElements([a, null, undefined])).toEqual([a]);
	});

	it('returns nothing for a nullish target', () => {
		expect(resolveElements(null)).toEqual([]);
		expect(resolveElements(undefined)).toEqual([]);
		expect(resolveElements(() => null)).toEqual([]);
	});

	it('returns a fresh array, so a caller cannot mutate the source', () => {
		const source = [a, b];
		const resolved = resolveElements(source);
		resolved.pop();
		expect(source).toEqual([a, b]);
	});

	it('collapses a repeated element', () => {
		// Observing the same element twice reports every mutation twice.
		expect(resolveElements([a, a, b, a])).toEqual([a, b]);
	});

	it('keeps a text node, which MutationObserver accepts', () => {
		const text = { nodeType: 3 } as unknown as Element;
		expect(resolveElements(text as MaybeElements)).toEqual([text]);
	});
});
