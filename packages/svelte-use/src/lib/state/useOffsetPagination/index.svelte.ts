import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { resolveGetter } from '../../shared/getter.ts';

/** Options for {@link useOffsetPagination}. */
export interface UseOffsetPaginationOptions {
	/** Called with the pagination state whenever the page count changes. */
	onPageCountChange?: (state: UseOffsetPaginationReturn) => void;
	/** Called with the pagination state whenever the page size changes. */
	onPageSizeChange?: (state: UseOffsetPaginationReturn) => void;
	/** Called with the pagination state whenever the page changes. */
	onPageChange?: (state: UseOffsetPaginationReturn) => void;
	/** Items per page (clamped to `>= 1`). @default 10 */
	pageSize?: MaybeGetter<number>;
	/** Total number of items. Omit for an unbounded (infinite) listing. */
	total?: MaybeGetter<number>;
	/** Initial current page (clamped to `[1, pageCount]`). @default 1 */
	page?: MaybeGetter<number>;
}

/** Pagination state returned by {@link useOffsetPagination}. */
export interface UseOffsetPaginationReturn {
	/** Whether the current page is the first one. Getter-backed. */
	readonly isFirstPage: boolean;
	/** Whether the current page is the last one. Getter-backed. */
	readonly isLastPage: boolean;
	/** Total pages (`Infinity` when unbounded). Getter-backed. */
	readonly pageCount: number;
	/** Current page size, clamped to `>= 1`. Getter/setter-backed. */
	currentPageSize: number;
	/** Current page, clamped to `[1, pageCount]`. Getter/setter-backed. */
	currentPage: number;
	/** Go forward one page (clamped). */
	next: () => void;
	/** Go back one page (clamped). */
	prev: () => void;
}

/** Pagination state without `isLastPage` (unbounded listing). */
export type UseOffsetPaginationInfinityReturn = Omit<UseOffsetPaginationReturn, 'isLastPage'>;

/**
 * Offset-based pagination state with clamped page navigation.
 *
 * @param options `total`, `page`, `pageSize`, and change callbacks.
 * @returns Page state plus clamped `prev` / `next`.
 * @example
 * ```ts
 * const pages = useOffsetPagination({ total: 95 });
 * pages.next();
 * pages.currentPage; // 2
 * ```
 */
export function useOffsetPagination(
	options: Omit<UseOffsetPaginationOptions, 'total'> & { total?: never }
): UseOffsetPaginationInfinityReturn;
/**
 * Offset-based pagination state with clamped page navigation.
 *
 * @param options `total`, `page`, `pageSize`, and change callbacks.
 * @returns Page state plus clamped `prev` / `next`.
 * @example
 * ```ts
 * const pages = useOffsetPagination({ total: 95 });
 * pages.next();
 * pages.currentPage; // 2
 * ```
 */
export function useOffsetPagination(options: UseOffsetPaginationOptions): UseOffsetPaginationReturn;
export function useOffsetPagination(
	options: UseOffsetPaginationOptions
): UseOffsetPaginationReturn {
	const {
		total,
		pageSize = 10,
		page = 1,
		onPageChange,
		onPageSizeChange,
		onPageCountChange
	} = options;

	let pageState = $state(resolveGetter(page));
	let sizeState = $state(Math.max(1, resolveGetter(pageSize)));

	const pageCount = $derived.by(() => {
		if (total === undefined) return Number.POSITIVE_INFINITY;
		return Math.max(1, Math.ceil(resolveGetter(total) / sizeState));
	});

	const api: UseOffsetPaginationReturn = {
		get currentPage() {
			return Math.min(Math.max(1, pageState), pageCount);
		},
		set currentPage(nextPage: number) {
			pageState = Math.min(Math.max(1, nextPage), pageCount);
		},
		get currentPageSize() {
			return sizeState;
		},
		set currentPageSize(nextSize: number) {
			sizeState = Math.max(1, nextSize);
		},
		get pageCount() {
			return pageCount;
		},
		get isFirstPage() {
			return api.currentPage === 1;
		},
		get isLastPage() {
			return api.currentPage === pageCount;
		},
		prev() {
			api.currentPage -= 1;
		},
		next() {
			api.currentPage += 1;
		}
	};

	// Deliver change callbacks for every mutation path (prev/next/setter),
	// including clamped writes. First runs are skipped so construction is quiet.
	let lastPage = api.currentPage;
	let lastSize = sizeState;
	let lastCount = pageCount;

	if (onPageChange) {
		$effect(() => {
			const current = api.currentPage;
			untrack(() => {
				if (!Object.is(current, lastPage)) {
					lastPage = current;
					onPageChange(api);
				}
			});
		});
	}

	if (onPageSizeChange) {
		$effect(() => {
			const current = sizeState;
			untrack(() => {
				if (!Object.is(current, lastSize)) {
					lastSize = current;
					onPageSizeChange(api);
				}
			});
		});
	}

	if (onPageCountChange) {
		$effect(() => {
			const current = pageCount;
			untrack(() => {
				if (!Object.is(current, lastCount)) {
					lastCount = current;
					onPageCountChange(api);
				}
			});
		});
	}

	return api;
}
