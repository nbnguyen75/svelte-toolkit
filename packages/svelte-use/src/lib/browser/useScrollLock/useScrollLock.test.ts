// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { UseScrollLockTarget } from './index.ts';
import { useScrollLock } from './index.ts';

type LockApi = ReturnType<typeof useScrollLock>;

async function mountLock(
	element: UseScrollLockTarget,
	initialState?: boolean
): Promise<{ api: LockApi; dispose: () => Promise<void> }> {
	return mountUtil(() => useScrollLock(() => element, initialState));
}

describe('useScrollLock', () => {
	const created: HTMLElement[] = [];

	function track(): HTMLElement {
		const el = document.createElement('div');
		document.body.append(el);
		created.push(el);
		return el;
	}

	beforeEach(() => {
		document.documentElement.style.overflow = '';
		document.body.style.overflow = '';
	});

	afterEach(() => {
		for (const el of created.splice(0)) el.remove();
		document.documentElement.style.overflow = '';
		document.body.style.overflow = '';
	});

	describe('locking', () => {
		it('starts unlocked', async () => {
			const el = track();
			const { api, dispose } = await mountLock(el);
			try {
				expect(api.locked).toBe(false);
				expect(el.style.overflow).toBe('');
			} finally {
				await dispose();
			}
		});

		it('locks on assignment', async () => {
			const el = track();
			const { api, dispose } = await mountLock(el);
			try {
				api.locked = true;
				expect(api.locked).toBe(true);
				expect(el.style.overflow).toBe('hidden');
			} finally {
				await dispose();
			}
		});

		it('unlocks on assignment', async () => {
			const el = track();
			const { api, dispose } = await mountLock(el);
			try {
				api.locked = true;
				api.locked = false;

				expect(api.locked).toBe(false);
				expect(el.style.overflow).toBe('');
			} finally {
				await dispose();
			}
		});

		it('honours initialState', async () => {
			const el = track();
			const { api, dispose } = await mountLock(el, true);
			try {
				expect(api.locked).toBe(true);
				expect(el.style.overflow).toBe('hidden');
			} finally {
				await dispose();
			}
		});

		it('restores a pre-existing inline overflow', async () => {
			const el = track();
			el.style.overflow = 'auto';
			const { api, dispose } = await mountLock(el);
			try {
				api.locked = true;
				expect(el.style.overflow).toBe('hidden');

				api.locked = false;
				expect(el.style.overflow).toBe('auto');
			} finally {
				await dispose();
			}
		});

		it('restores a pre-existing hidden overflow rather than clearing it', async () => {
			const el = track();
			el.style.overflow = 'hidden';
			const { api, dispose } = await mountLock(el);
			try {
				api.locked = true;
				api.locked = false;

				// Unlocking must not leave the element unlocked-looking when the
				// author had already hidden it themselves.
				expect(el.style.overflow).toBe('hidden');
			} finally {
				await dispose();
			}
		});

		it('is idempotent under repeated locks', async () => {
			const el = track();
			el.style.overflow = 'scroll';
			const { api, dispose } = await mountLock(el);
			try {
				api.locked = true;
				// A second lock must not overwrite the captured 'scroll' baseline.
				api.locked = true;
				expect(el.style.overflow).toBe('hidden');

				api.locked = false;
				expect(el.style.overflow).toBe('scroll');
			} finally {
				await dispose();
			}
		});

		it('re-captures on a second lock cycle', async () => {
			const el = track();
			const { api, dispose } = await mountLock(el);
			try {
				api.locked = true;
				api.locked = false;
				expect(el.style.overflow).toBe('');

				el.style.overflow = 'clip';
				api.locked = true;
				expect(el.style.overflow).toBe('hidden');

				api.locked = false;
				expect(el.style.overflow).toBe('clip');
			} finally {
				await dispose();
			}
		});

		it('ignores an unlock with no lock', async () => {
			const el = track();
			el.style.overflow = 'auto';
			const { api, dispose } = await mountLock(el);
			try {
				api.locked = false;
				expect(el.style.overflow).toBe('auto');
				expect(api.locked).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('locks the documentElement for a window target', async () => {
			const { api, dispose } = await mountLock(window);
			try {
				api.locked = true;
				expect(document.documentElement.style.overflow).toBe('hidden');
				expect(document.body.style.overflow).toBe('');

				api.locked = false;
				expect(document.documentElement.style.overflow).toBe('');
			} finally {
				await dispose();
			}
		});

		it('locks the documentElement for a document target', async () => {
			const { api, dispose } = await mountLock(document);
			try {
				api.locked = true;
				expect(document.documentElement.style.overflow).toBe('hidden');

				api.locked = false;
				expect(document.documentElement.style.overflow).toBe('');
			} finally {
				await dispose();
			}
		});

		it('locks body directly', async () => {
			const { api, dispose } = await mountLock(document.body);
			try {
				api.locked = true;
				expect(document.body.style.overflow).toBe('hidden');

				api.locked = false;
				expect(document.body.style.overflow).toBe('');
			} finally {
				await dispose();
			}
		});

		it('does nothing for a null target', async () => {
			const { api, dispose } = await mountLock(null);
			try {
				expect(() => {
					api.locked = true;
				}).not.toThrow();
				expect(api.locked).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('does nothing for an undefined target', async () => {
			const { api, dispose } = await mountLock(undefined);
			try {
				api.locked = true;
				expect(api.locked).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('unlocks an unresolvable target cleanly', async () => {
			const { api, dispose } = await mountLock(null);
			try {
				api.locked = false;
				expect(api.locked).toBe(false);
			} finally {
				await dispose();
			}
		});
	});

	describe('cleanup', () => {
		it('unlocks on unmount', async () => {
			const el = track();
			el.style.overflow = 'auto';
			const { api, dispose } = await mountLock(el);
			api.locked = true;
			await dispose();

			expect(el.style.overflow).toBe('auto');
		});

		it('unlocks the documentElement on unmount', async () => {
			document.documentElement.style.overflow = 'scroll';
			const { api, dispose } = await mountLock(document);
			api.locked = true;
			expect(document.documentElement.style.overflow).toBe('hidden');

			await dispose();
			expect(document.documentElement.style.overflow).toBe('scroll');
		});
	});

	describe('surface', () => {
		it('exposes exactly locked', async () => {
			const el = track();
			const { api, dispose } = await mountLock(el);
			try {
				expect(Object.keys(api)).toEqual(['locked']);
			} finally {
				await dispose();
			}
		});

		it('is writable, so bind: works', async () => {
			const el = track();
			let bound = false;
			const { api, dispose } = await mountUtil(() => {
				const lock = useScrollLock(() => el);
				return {
					get value() {
						return lock.locked;
					},
					set value(next: boolean) {
						bound = true;
						lock.locked = next;
					}
				};
			});
			try {
				api.value = true;
				expect(bound).toBe(true);
				expect(el.style.overflow).toBe('hidden');
			} finally {
				await dispose();
			}
		});
	});

	describe('iOS touch guard', () => {
		it('attaches no touchmove listener off iOS', async () => {
			const el = track();
			const add = vi.spyOn(el, 'addEventListener');
			const { api, dispose } = await mountLock(el);
			try {
				api.locked = true;
				const touches = add.mock.calls.filter(([name]) => name === 'touchmove');
				expect(touches).toHaveLength(0);
			} finally {
				await dispose();
			}
		});
	});
});
