// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { mountInitialized, mountUtil } from '../../../../test/fixtures/mount.ts';
import { DEFAULT_MAGIC_KEYS_ALIAS_MAP, useMagicKeys } from './index.ts';

function press(
	key: string,
	type: 'keydown' | 'keyup' = 'keydown',
	init: KeyboardEventInit = {}
): void {
	window.dispatchEvent(new KeyboardEvent(type, { key, ...init }));
}

function down(key: string, init: KeyboardEventInit = {}): void {
	press(key, 'keydown', init);
}

function up(key: string, init: KeyboardEventInit = {}): void {
	press(key, 'keyup', init);
}

describe('useMagicKeys', () => {
	describe('single keys', () => {
		it('reports a key held then released', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				expect(api.a).toBe(false);
				down('a');
				expect(api.a).toBe(true);
				up('a');
				expect(api.a).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('is case-insensitive on the key name', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Control');
				expect(api.control).toBe(true);
				expect(api.CONTROL).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('reads unknown keys as false without creating them', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				expect(api.nothing).toBe(false);
				down('a');
				// Reading must not have registered the unknown key.
				expect(api.nothing).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('tracks keys independently', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('a');
				down('b');
				expect(api.a).toBe(true);
				expect(api.b).toBe(true);
				up('a');
				expect(api.a).toBe(false);
				expect(api.b).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('exposes the raw pressed set', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				expect([...api.current]).toEqual([]);
				down('Control');
				down('K');
				expect([...api.current].sort()).toEqual(['control', 'k']);
				up('K');
				expect([...api.current]).toEqual(['control']);
			} finally {
				await dispose();
			}
		});
	});

	describe('aliases', () => {
		it.each([
			['ctrl', 'Control'],
			['command', 'Meta'],
			['cmd', 'Meta'],
			['option', 'Alt'],
			['up', 'ArrowUp'],
			['down', 'ArrowDown'],
			['left', 'ArrowLeft'],
			['right', 'ArrowRight']
		])('maps %s to the %s key', async (alias, key) => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down(key);
				expect(api[alias]).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('keeps the full-length name working alongside the alias', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Control');
				expect(api.ctrl).toBe(true);
				expect(api.control).toBe(true);
				expect(api.command).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('exports the default alias map', () => {
			expect(DEFAULT_MAGIC_KEYS_ALIAS_MAP.ctrl).toBe('control');
			expect(DEFAULT_MAGIC_KEYS_ALIAS_MAP.cmd).toBe('meta');
		});

		it('merges a custom map over the defaults', async () => {
			const { api, dispose } = await mountUtil(() =>
				useMagicKeys({ aliasMap: { ctrl: 'control', esc: 'escape' } })
			);
			try {
				down('Escape');
				expect(api.esc).toBe(true);
				// The defaults survive a partial map.
				down('ArrowUp');
				expect(api.up).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('lets a custom map override a default', async () => {
			const { api, dispose } = await mountUtil(() =>
				useMagicKeys({ aliasMap: { command: 'control' } })
			);
			try {
				down('Control');
				expect(api.command).toBe(true);
				down('Meta');
				expect(api.meta).toBe(true);
				// cmd still points at the overridden target, so it now reads Meta.
				expect(api.cmd).toBe(true);
			} finally {
				await dispose();
			}
		});
	});

	describe('combinations', () => {
		it('is true only while every key is held', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				expect(api.ctrl_k).toBe(false);
				down('Control');
				expect(api.ctrl_k).toBe(false);
				down('K');
				expect(api.ctrl_k).toBe(true);
				up('K');
				expect(api.ctrl_k).toBe(false);
				up('Control');
				expect(api.ctrl_k).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('accepts each of the + - _ separators', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Control');
				down('Shift');
				down('K');
				expect(api['ctrl+shift+k']).toBe(true);
				expect(api['ctrl-shift-k']).toBe(true);
				expect(api['ctrl_shift_k']).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('resolves aliases inside a combination', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Meta');
				down('K');
				// `cmd_k` reads the same state as `meta_k`.
				expect(api.cmd_k).toBe(true);
				expect(api.meta_k).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('tolerates whitespace around the parts', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Control');
				down('K');
				expect(api['ctrl + k']).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('is false for a combination with an empty part', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				// `every` on an empty list is true, which would be a stuck-true state.
				expect(api._).toBe(false);
			} finally {
				await dispose();
			}
		});
	});

	describe('modifier dependencies', () => {
		it('releases keys held with Shift when Shift is released', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Shift');
				down('A', { shiftKey: true });
				expect(api.a).toBe(true);

				// Browsers report "Shift is up" on the next event rather than as its own.
				up('Shift');
				down('Shift');
				up('Shift');
				expect(api.a).toBe(false);
				expect(api.shift).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('releases keys held with Alt when Alt is released', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Alt');
				down('B', { altKey: true });
				expect(api.b).toBe(true);

				up('Alt');
				expect(api.b).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('releases keys held with Meta when Meta is released', async () => {
			// macOS never fires keyup for keys held with Meta (#1312).
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Meta');
				down('C', { metaKey: true });
				expect(api.c).toBe(true);

				up('Meta');
				expect(api.c).toBe(false);
				expect(api.meta).toBe(false);
				expect([...api.current]).toEqual([]);
			} finally {
				await dispose();
			}
		});

		it('unwinds dependent keys in press order', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Shift');
				down('A', { shiftKey: true });
				down('B', { shiftKey: true });
				up('Shift');
				expect(api.a).toBe(false);
				expect(api.b).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('leaves keys pressed before the modifier alone', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('A');
				down('Shift');
				expect(api.a).toBe(true);
				up('Shift');
				// `a` was never booked against Shift, so it must survive.
				expect(api.a).toBe(true);
			} finally {
				await dispose();
			}
		});
	});

	describe('focus loss', () => {
		it('releases everything on window blur', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Control');
				down('K');
				expect(api.ctrl_k).toBe(true);

				window.dispatchEvent(new Event('blur'));
				expect(api.ctrl_k).toBe(false);
				expect(api.control).toBe(false);
				expect([...api.current]).toEqual([]);
			} finally {
				await dispose();
			}
		});

		it('releases everything on window focus', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('Shift');
				expect(api.shift).toBe(true);

				window.dispatchEvent(new Event('focus'));
				expect(api.shift).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('keeps working after a reset', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				down('a');
				window.dispatchEvent(new Event('blur'));
				down('b');
				expect(api.a).toBe(false);
				expect(api.b).toBe(true);
			} finally {
				await dispose();
			}
		});
	});

	describe('reactivity', () => {
		it('re-runs a reading effect when a combination turns on', async () => {
			const seen: boolean[] = [];
			const { dispose } = await mountInitialized(
				() => useMagicKeys(),
				(api) => {
					seen.push(api.ctrl_k === true);
				}
			);
			try {
				down('Control');
				await tick();
				down('K');
				await tick();
				expect(seen).toEqual([false, false, true]);
			} finally {
				await dispose();
			}
		});

		it('re-runs a reading effect when a combination turns off', async () => {
			const seen: boolean[] = [];
			const { dispose } = await mountInitialized(
				() => useMagicKeys(),
				(api) => {
					seen.push(api.shift === true);
				}
			);
			try {
				down('Shift');
				await tick();
				expect(seen).toEqual([false, true]);
				up('Shift');
				await tick();
				expect(seen).toEqual([false, true, false]);
			} finally {
				await dispose();
			}
		});

		it('tracks a combination read before any keypress', async () => {
			// A `$state` object would subscribe to nothing for a key that has never
			// been set, so this read has to be what makes the effect re-run later.
			const seen: boolean[] = [];
			const { dispose } = await mountInitialized(
				() => useMagicKeys(),
				(api) => {
					seen.push(api.meta_shift === true);
				}
			);
			try {
				down('Meta');
				await tick();
				down('Shift');
				await tick();
				expect(seen).toEqual([false, false, true]);
			} finally {
				await dispose();
			}
		});

		it('re-runs a reading effect for current', async () => {
			const sizes: number[] = [];
			const { dispose } = await mountInitialized(
				() => useMagicKeys(),
				(api) => {
					sizes.push(api.current.size);
				}
			);
			try {
				down('a');
				await tick();
				expect(sizes).toEqual([0, 1]);
				up('a');
				await tick();
				expect(sizes).toEqual([0, 1, 0]);
			} finally {
				await dispose();
			}
		});
	});

	describe('options', () => {
		it('listens on a custom target', async () => {
			const el = document.createElement('div');
			document.body.append(el);
			const { api, dispose } = await mountUtil(() => useMagicKeys({ target: () => el }));
			try {
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
				expect(api.a).toBe(false);

				el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
				expect(api.a).toBe(true);
				el.remove();
			} finally {
				await dispose();
			}
		});

		it('attaches nothing for a null target', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys({ target: null }));
			try {
				down('a');
				expect(api.a).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('calls onEventFired for both directions', async () => {
			const onEventFired = vi.fn();
			const { dispose } = await mountUtil(() => useMagicKeys({ onEventFired }));
			try {
				down('a');
				up('a');
				expect(onEventFired).toHaveBeenCalledTimes(2);
				expect(onEventFired.mock.calls[0]?.[0].type).toBe('keydown');
				expect(onEventFired.mock.calls[1]?.[0].type).toBe('keyup');
			} finally {
				await dispose();
			}
		});

		it('calls onEventFired after the state is updated', async () => {
			const seen: boolean[] = [];
			const { dispose } = await mountUtil(() =>
				useMagicKeys({ onEventFired: () => seen.push(true) })
			);
			try {
				down('a');
				expect(seen).toEqual([true]);
			} finally {
				await dispose();
			}
		});

		it('registers passive listeners by default', async () => {
			const spy = vi.spyOn(window, 'addEventListener');
			const { dispose } = await mountUtil(() => useMagicKeys());
			await dispose();
			const keydown = spy.mock.calls.find((call) => call[0] === 'keydown');
			expect(keydown?.[2]).toEqual(expect.objectContaining({ passive: true }));
			spy.mockRestore();
		});

		it('honours passive: false for preventDefault work', async () => {
			const spy = vi.spyOn(window, 'addEventListener');
			const { dispose } = await mountUtil(() => useMagicKeys({ passive: false }));
			await dispose();
			const keydown = spy.mock.calls.find((call) => call[0] === 'keydown');
			expect(keydown?.[2]).toEqual(expect.objectContaining({ passive: false }));
			spy.mockRestore();
		});
	});

	describe('robustness', () => {
		it('ignores a non-keyboard event', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				window.dispatchEvent(new Event('keydown'));
				expect([...api.current]).toEqual([]);
			} finally {
				await dispose();
			}
		});

		it('ignores an event with an empty key', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				window.dispatchEvent(new KeyboardEvent('keydown', { key: '' }));
				expect([...api.current]).toEqual([]);
			} finally {
				await dispose();
			}
		});

		it('returns undefined for a symbol property', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			try {
				const symbol = Symbol('probe');
				expect((api as Record<symbol, unknown>)[symbol]).toBeUndefined();
			} finally {
				await dispose();
			}
		});

		it('stops tracking after unmount', async () => {
			const { api, dispose } = await mountUtil(() => useMagicKeys());
			await dispose();
			down('a');
			expect(api.a).toBe(false);
		});

		it('gives each call its own state', async () => {
			const first = await mountUtil(() => useMagicKeys());
			const second = await mountUtil(() => useMagicKeys());
			try {
				down('a');
				expect(first.api.a).toBe(true);
				expect(second.api.a).toBe(true);
				up('a');
				expect(first.api.a).toBe(false);
				expect(second.api.a).toBe(false);
			} finally {
				await first.dispose();
				await second.dispose();
			}
		});
	});
});
