// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountSetup } from '../../../../test/fixtures/mount.ts';
import type { KeyFilter, OnKeyStrokeOptions } from './index.ts';
import { onKeyDown, onKeyPressed, onKeyStroke, onKeyUp } from './index.ts';

/**
 * These utils return nothing, so `mountUtil` is the wrong harness: it throws
 * "setup did not produce an API" on a `void` factory. `mountSetup` only cares
 * about the teardown.
 */
function mountListener(setup: () => void): Promise<{ dispose: () => Promise<void> }> {
	return mountSetup(setup);
}

function key(name: string, init: KeyboardEventInit = {}): KeyboardEvent {
	return new KeyboardEvent('keydown', { key: name, code: `Key${name.toUpperCase()}`, ...init });
}

function press(name: string, init: KeyboardEventInit = {}): void {
	window.dispatchEvent(key(name, init));
}

const created: HTMLElement[] = [];

function track(): HTMLInputElement {
	const el = document.createElement('input');
	document.body.append(el);
	created.push(el);
	return el;
}

afterEach(() => {
	for (const el of created.splice(0)) el.remove();
});

describe('onKeyStroke', () => {
	describe('key filters', () => {
		it('fires for a matching key', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('Escape', handler);
			});
			try {
				press('Escape');
				expect(handler).toHaveBeenCalledTimes(1);
				expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(KeyboardEvent);
			} finally {
				await dispose();
			}
		});

		it('ignores a non-matching key', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('Escape', handler);
			});
			try {
				press('Enter');
				expect(handler).not.toHaveBeenCalled();
			} finally {
				await dispose();
			}
		});

		it('matches any key in an array', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke(['a', 'b'], handler);
			});
			try {
				press('a');
				press('b');
				press('c');
				expect(handler).toHaveBeenCalledTimes(2);
			} finally {
				await dispose();
			}
		});

		it('accepts a predicate as the key filter', async () => {
			const handler = vi.fn();
			const predicate = (event: KeyboardEvent) => event.key.length === 1;
			const { dispose } = await mountListener(() => {
				onKeyStroke(predicate, handler);
			});
			try {
				press('x');
				press('ArrowUp');
				expect(handler).toHaveBeenCalledTimes(1);
				expect(handler.mock.calls[0]?.[0].key).toBe('x');
			} finally {
				await dispose();
			}
		});

		it('fires for every key with the handler-only overload', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke(handler);
			});
			try {
				press('a');
				press('Enter');
				press('Shift');
				expect(handler).toHaveBeenCalledTimes(3);
			} finally {
				await dispose();
			}
		});

		it('runs a truthy-returning handler exactly once per key', async () => {
			// The handler-only overload carries no filter. If the handler were
			// used as the filter too, a truthy return would let it run a second
			// time. A `vi.fn()` returning `undefined` cannot catch that, which is
			// why this counts a handler that returns `true`.
			const handler = vi.fn(() => true);
			const { dispose } = await mountListener(() => {
				onKeyStroke(handler);
			});
			try {
				press('a');
				press('Enter');
				expect(handler).toHaveBeenCalledTimes(2);
			} finally {
				await dispose();
			}
		});

		it('treats an explicit true filter as every key', async () => {
			const handler = vi.fn();
			const filter: KeyFilter = true;
			const { dispose } = await mountListener(() => {
				onKeyStroke(filter, handler);
			});
			try {
				press('a');
				press('b');
				expect(handler).toHaveBeenCalledTimes(2);
			} finally {
				await dispose();
			}
		});

		it('does not confuse a predicate for the handler', async () => {
			// The predicate and the handler are both functions; if the first one
			// were mistaken for the handler, this handler would never fire.
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke(() => true, handler);
			});
			try {
				press('a');
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});
	});

	describe('event names', () => {
		it('defaults to keydown', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler);
			});
			try {
				window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
				expect(handler).not.toHaveBeenCalled();
				press('a');
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('listens on keypress when asked', async () => {
			const handler = vi.fn();
			const options: OnKeyStrokeOptions = { eventName: 'keypress' };
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler, options);
			});
			try {
				window.dispatchEvent(new KeyboardEvent('keypress', { key: 'a' }));
				expect(handler).toHaveBeenCalledTimes(1);
				press('a');
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('listens on keyup when asked', async () => {
			const handler = vi.fn();
			const options: OnKeyStrokeOptions = { eventName: 'keyup' };
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler, options);
			});
			try {
				press('a');
				expect(handler).not.toHaveBeenCalled();
				window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});
	});

	describe('onKeyDown / onKeyPressed / onKeyUp', () => {
		it('onKeyDown listens on keydown', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyDown('a', handler);
			});
			try {
				window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
				expect(handler).not.toHaveBeenCalled();
				press('a');
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('onKeyPressed listens on keypress', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyPressed('a', handler);
			});
			try {
				window.dispatchEvent(new KeyboardEvent('keypress', { key: 'a' }));
				expect(handler).toHaveBeenCalledTimes(1);
				press('a');
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('onKeyUp listens on keyup', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyUp('Shift', handler);
			});
			try {
				press('Shift');
				expect(handler).not.toHaveBeenCalled();
				window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('onKeyDown honours the key filter', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyDown(['Control', 's'], handler);
			});
			try {
				press('s');
				expect(handler).toHaveBeenCalledTimes(1);
				press('q');
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});
	});

	describe('targets', () => {
		it('listens on window by default', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler);
			});
			try {
				press('a');
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('listens on a custom element target', async () => {
			const el = track();
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler, { target: () => el });
			});
			try {
				el.dispatchEvent(key('a'));
				expect(handler).toHaveBeenCalledTimes(1);
				// Window is no longer the target.
				press('a');
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('accepts a bare element target', async () => {
			const el = track();
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler, { target: el });
			});
			try {
				el.dispatchEvent(key('a'));
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('attaches nothing for a null target', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler, { target: null });
			});
			try {
				press('a');
				expect(handler).not.toHaveBeenCalled();
			} finally {
				await dispose();
			}
		});

		it('works with the handler-only overload and options', async () => {
			const el = track();
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke(handler, { target: () => el });
			});
			try {
				el.dispatchEvent(key('z'));
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});
	});

	describe('dedupe', () => {
		it('forwards auto-repeat by default', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler);
			});
			try {
				press('a', { repeat: true });
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('drops auto-repeat when dedupe is on', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler, { dedupe: true });
			});
			try {
				press('a', { repeat: true });
				press('a', { repeat: true });
				expect(handler).not.toHaveBeenCalled();
				// The first, non-repeat press still fires.
				press('a');
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('re-reads a dedupe getter on every event', async () => {
			const handler = vi.fn();
			const box = { on: false };
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler, { dedupe: () => box.on });
			});
			try {
				press('a', { repeat: true });
				expect(handler).toHaveBeenCalledTimes(1);
				box.on = true;
				press('a', { repeat: true });
				expect(handler).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		});

		it('checks repeat before the predicate', async () => {
			// A deduped repeat never reaches the predicate, so a predicate with a
			// side effect must not observe it.
			const predicate = vi.fn(() => true);
			const { dispose } = await mountListener(() => {
				onKeyStroke(predicate, vi.fn(), { dedupe: true });
			});
			try {
				press('a', { repeat: true });
				expect(predicate).not.toHaveBeenCalled();
			} finally {
				await dispose();
			}
		});
	});

	describe('robustness', () => {
		it('ignores a non-keyboard event carrying a keyboard name', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke(handler);
			});
			try {
				window.dispatchEvent(new Event('keydown'));
				expect(handler).not.toHaveBeenCalled();
			} finally {
				await dispose();
			}
		});

		it('stops listening after unmount', async () => {
			const handler = vi.fn();
			const { dispose } = await mountListener(() => {
				onKeyStroke('a', handler);
			});
			await dispose();
			press('a');
			expect(handler).not.toHaveBeenCalled();
		});

		it('returns undefined, cleanup being automatic', async () => {
			let returned: unknown = 'not called';
			const { dispose } = await mountListener(() => {
				returned = onKeyStroke('a', vi.fn());
			});
			try {
				expect(returned).toBeUndefined();
			} finally {
				await dispose();
			}
		});
	});
});
