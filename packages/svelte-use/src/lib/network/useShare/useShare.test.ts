// @vitest-environment jsdom
/**
 * `useShare` is rune-free, so the factory is called directly — no mounting.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UseShareReturn } from './index.ts';
import { useShare } from './index.ts';

function stubNavigator(
	canShare: (data: object) => boolean,
	share: (data: object) => Promise<void>
) {
	Object.defineProperty(window.navigator, 'canShare', { configurable: true, value: canShare });
	Object.defineProperty(window.navigator, 'share', { configurable: true, value: share });
}

afterEach(() => {
	Reflect.deleteProperty(window.navigator, 'canShare');
	Reflect.deleteProperty(window.navigator, 'share');
});

describe('useShare', () => {
	it('is unsupported without the API', () => {
		const api: UseShareReturn = useShare();

		expect(api.isSupported).toBe(false);
	});

	it('resolves without sharing when unsupported', async () => {
		const { share } = useShare({ title: 'x' });

		await expect(share()).resolves.toBe(undefined);
	});

	it('shares when the platform grants', async () => {
		const shared: object[] = [];
		const granted: object[] = [];
		stubNavigator(
			(data) => {
				granted.push(data);
				return true;
			},
			async (data) => {
				shared.push(data);
			}
		);
		const { isSupported, share } = useShare({ title: 'Score' });

		expect(isSupported).toBe(true);
		await share({ text: 'I won' });

		expect(granted).toHaveLength(1);
		expect(shared).toEqual([{ title: 'Score', text: 'I won' }]);
	});

	it('does not share when the platform declines', async () => {
		const shareFn = vi.fn(async () => {});
		stubNavigator(() => false, shareFn);
		const { share } = useShare();

		await share({ url: 'https://example.com' });

		expect(shareFn).not.toHaveBeenCalled();
	});

	it('reads setup options from a getter per share', async () => {
		let title = 'first';
		const shared: object[] = [];
		stubNavigator(
			() => true,
			async (data) => {
				shared.push(data);
			}
		);
		const { share } = useShare(() => ({ title }));

		await share();
		title = 'second';
		await share();

		expect(shared).toEqual([{ title: 'first' }, { title: 'second' }]);
	});

	it('rejects a present-but-undefined canShare', () => {
		Object.defineProperty(window.navigator, 'canShare', {
			configurable: true,
			value: undefined
		});
		const { isSupported } = useShare();

		expect(isSupported).toBe(false);
	});
});
