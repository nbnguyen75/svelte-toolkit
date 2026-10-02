// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useOffsetPagination } from './index.ts';

describe('useOffsetPagination', () => {
	it('starts on page 1 with a computed page count', async () => {
		const { api, dispose } = await mountUtil(() => useOffsetPagination({ total: 95 }));
		try {
			expect(api.currentPage).toBe(1);
			expect(api.currentPageSize).toBe(10);
			expect(api.pageCount).toBe(10);
			expect(api.isFirstPage).toBe(true);
			expect(api.isLastPage).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('defaults to page size 10 and honours pageSize', async () => {
		const { api, dispose } = await mountUtil(() => useOffsetPagination({ total: 95 }));
		const other = await mountUtil(() => useOffsetPagination({ total: 95, pageSize: () => 20 }));
		try {
			expect(api.currentPageSize).toBe(10);
			expect(api.pageCount).toBe(10);
			expect(other.api.currentPageSize).toBe(20);
			expect(other.api.pageCount).toBe(5);
		} finally {
			await dispose();
			await other.dispose();
		}
	});

	it('navigates with next and prev', async () => {
		const { api, dispose } = await mountUtil(() => useOffsetPagination({ total: 95 }));
		try {
			api.next();
			expect(api.currentPage).toBe(2);
			api.prev();
			expect(api.currentPage).toBe(1);
		} finally {
			await dispose();
		}
	});

	it('clamps navigation to the first and last page', async () => {
		const { api, dispose } = await mountUtil(() => useOffsetPagination({ total: 25 }));
		try {
			api.prev();
			expect(api.currentPage).toBe(1);

			api.next();
			api.next();
			expect(api.currentPage).toBe(3);
			expect(api.isLastPage).toBe(true);

			api.next();
			expect(api.currentPage).toBe(3);
		} finally {
			await dispose();
		}
	});

	it('clamps the page setter', async () => {
		const { api, dispose } = await mountUtil(() => useOffsetPagination({ total: 25 }));
		try {
			api.currentPage = 0;
			expect(api.currentPage).toBe(1);
			api.currentPage = 99;
			expect(api.currentPage).toBe(3);
		} finally {
			await dispose();
		}
	});

	it('clamps the page size to at least 1 and recomputes the count', async () => {
		const { api, dispose } = await mountUtil(() => useOffsetPagination({ total: 25 }));
		try {
			api.currentPageSize = 5;
			expect(api.pageCount).toBe(5);

			api.currentPageSize = 0;
			expect(api.currentPageSize).toBe(1);
			expect(api.pageCount).toBe(25);
		} finally {
			await dispose();
		}
	});

	it('reports a single page for a tiny total', async () => {
		const { api, dispose } = await mountUtil(() => useOffsetPagination({ total: 3 }));
		try {
			expect(api.pageCount).toBe(1);
			expect(api.isFirstPage).toBe(true);
			expect(api.isLastPage).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('is unbounded without a total', async () => {
		const { api, dispose } = await mountUtil(() => useOffsetPagination({}));
		try {
			expect(api.pageCount).toBe(Number.POSITIVE_INFINITY);
			api.next();
			api.next();
			expect(api.currentPage).toBe(3);
			api.prev();
			api.prev();
			expect(api.currentPage).toBe(1);
		} finally {
			await dispose();
		}
	});

	it('accepts a getter total and reacts to it', async () => {
		const total = createBox(25);
		const { api, dispose } = await mountUtil(() =>
			useOffsetPagination({ total: () => total.value })
		);
		try {
			expect(api.pageCount).toBe(3);
			total.value = 100;
			await tick();
			expect(api.pageCount).toBe(10);
		} finally {
			await dispose();
		}
	});

	it('fires onPageChange after the first change only', async () => {
		const onPageChange = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			useOffsetPagination({ total: 25, onPageChange })
		);
		try {
			expect(onPageChange).not.toHaveBeenCalled();

			api.next();
			await tick();
			expect(onPageChange).toHaveBeenCalledTimes(1);
			expect(onPageChange.mock.calls[0]?.[0]).toBe(api);

			api.next();
			await tick();
			expect(onPageChange).toHaveBeenCalledTimes(2);
		} finally {
			await dispose();
		}
	});

	it('fires onPageSizeChange when the size changes', async () => {
		const onPageSizeChange = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			useOffsetPagination({ total: 25, onPageSizeChange })
		);
		try {
			expect(onPageSizeChange).not.toHaveBeenCalled();
			api.currentPageSize = 5;
			await tick();
			expect(onPageSizeChange).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('fires onPageCountChange when the count changes', async () => {
		const onPageCountChange = vi.fn();
		const total = createBox(25);
		const { api, dispose } = await mountUtil(() =>
			useOffsetPagination({ total: () => total.value, onPageCountChange })
		);
		try {
			expect(onPageCountChange).not.toHaveBeenCalled();
			total.value = 100;
			await tick();
			expect(onPageCountChange).toHaveBeenCalledTimes(1);
			expect(api.pageCount).toBe(10);
		} finally {
			await dispose();
		}
	});

	it('stays quiet when callbacks are omitted', async () => {
		const { api, dispose } = await mountUtil(() => useOffsetPagination({ total: 25 }));
		try {
			expect(() => {
				api.next();
				api.currentPageSize = 5;
			}).not.toThrow();
		} finally {
			await dispose();
		}
	});
});
