// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useStepper } from './index.ts';

describe('useStepper', () => {
	it('starts at the first step of an array', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['intro', 'form', 'done']));
		try {
			expect(api.index).toBe(0);
			expect(api.current).toBe('intro');
			expect(api.isFirst).toBe(true);
			expect(api.isLast).toBe(false);
			expect(api.stepNames).toEqual(['intro', 'form', 'done']);
		} finally {
			await dispose();
		}
	});

	it('honours an initial step', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['a', 'b', 'c'], 'b'));
		try {
			expect(api.current).toBe('b');
			expect(api.previous).toBe('a');
			expect(api.next).toBe('c');
		} finally {
			await dispose();
		}
	});

	it('navigates forward and back without escaping the range', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['a', 'b', 'c']));
		try {
			api.goToPrevious();
			expect(api.index).toBe(0);

			api.goToNext();
			api.goToNext();
			expect(api.current).toBe('c');
			api.goToNext();
			expect(api.index).toBe(2);

			api.goToNext();
			expect(api.index).toBe(2);
		} finally {
			await dispose();
		}
	});

	it('ignores unknown steps in goTo', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['a', 'b']));
		try {
			api.goTo('nope');
			expect(api.index).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('goBackTo only moves backwards', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['a', 'b', 'c'], 'c'));
		try {
			api.goBackTo('a');
			expect(api.current).toBe('a');
			// Already at 'a', so going back to 'b' is ignored.
			api.goBackTo('b');
			expect(api.current).toBe('a');
		} finally {
			await dispose();
		}
	});

	it('reports before/after/current/next/previous', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['a', 'b', 'c'], 'b'));
		try {
			expect(api.isCurrent('b')).toBe(true);
			expect(api.isNext('c')).toBe(true);
			expect(api.isPrevious('a')).toBe(true);
			expect(api.isBefore('c')).toBe(true);
			expect(api.isAfter('a')).toBe(true);
			expect(api.isBefore('a')).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('reads steps by index and by name', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['a', 'b', 'c']));
		try {
			expect(api.at(1)).toBe('b');
			expect(api.at(99)).toBeUndefined();
			expect(api.get('c')).toBe('c');
			expect(api.get('zz')).toBeUndefined();
		} finally {
			await dispose();
		}
	});

	it('supports record steps keyed by name', async () => {
		const { api, dispose } = await mountUtil(() =>
			useStepper({ intro: 'Intro step', form: 'Form step' })
		);
		try {
			expect(api.stepNames).toEqual(['intro', 'form']);
			expect(api.current).toBe('Intro step');
			expect(api.get('form')).toBe('Form step');
			api.goTo('form');
			expect(api.current).toBe('Form step');
			expect(api.isLast).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('writes through the index setter', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['a', 'b', 'c']));
		try {
			api.index = 2;
			expect(api.current).toBe('c');
		} finally {
			await dispose();
		}
	});

	it('re-anchors when a reactive step list changes', async () => {
		const steps = createBox(['a', 'b', 'c']);
		const { api, dispose } = await mountUtil(() => useStepper(() => steps.value));
		try {
			steps.value = ['x', 'y'];
			await tick();
			expect(api.stepNames).toEqual(['x', 'y']);
			expect(api.current).toBe('x');
		} finally {
			await dispose();
		}
	});

	it('handles a single step', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['only']));
		try {
			expect(api.isFirst).toBe(true);
			expect(api.isLast).toBe(true);
			expect(api.next).toBeUndefined();
			expect(api.previous).toBeUndefined();
		} finally {
			await dispose();
		}
	});

	it('falls back to the first step for an unknown initial step', async () => {
		const { api, dispose } = await mountUtil(() => useStepper(['a', 'b'], 'zz'));
		try {
			expect(api.index).toBe(0);
		} finally {
			await dispose();
		}
	});
});
