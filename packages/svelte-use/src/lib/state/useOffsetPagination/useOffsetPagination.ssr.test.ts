/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `$effect` never runs, so the change callbacks must stay silent while the
 * page arithmetic still works.
 */
import { describe, expect, it, vi } from 'vitest';

import { useOffsetPagination } from './index.ts';

describe('useOffsetPagination (ssr)', () => {
	it('computes and navigates pages without a DOM', () => {
		const pages = useOffsetPagination({ total: 95 });

		expect(pages.pageCount).toBe(10);
		expect(pages.currentPage).toBe(1);

		pages.next();
		expect(pages.currentPage).toBe(2);
		pages.prev();
		expect(pages.currentPage).toBe(1);
	});

	it('never fires change callbacks on the server', () => {
		const onPageChange = vi.fn();
		const pages = useOffsetPagination({ total: 25, onPageChange });

		pages.next();

		expect(pages.currentPage).toBe(2);
		expect(onPageChange).not.toHaveBeenCalled();
	});
});
