/**
 * True when both `window` and `document` exist (real browser DOM).
 * Module-scope immutable constant — safe to evaluate during SSR.
 * @example
 * ```ts
 * if (!isBrowser) return; // SSR guard
 * ```
 */
export const isBrowser: boolean = typeof window !== 'undefined' && typeof document !== 'undefined';
