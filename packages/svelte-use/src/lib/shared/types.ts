/**
 * Shared structural types.
 *
 * Internal: nothing here is re-exported from the package barrel, so these are
 * not public API. A util that puts one of these in its own public signature
 * re-exports it (`useDraggable` re-exports {@link Position}), which keeps it
 * exported exactly once - a symbol exported from two paths is dropped silently.
 */

/**
 * A point in pixels.
 *
 * Whether it is viewport-relative or element-relative is up to the util that
 * reports it; the shape is the same either way.
 */
export interface Position {
	x: number;
	y: number;
}
