/**
 * Deterministic `requestAnimationFrame` mock for tests: instead of firing
 * on a timer, frames run only when `step()` is called with an explicit
 * timestamp. Test-only: never imported by library code, never packaged.
 */
export interface ManualRaf {
	/** Run the pending frame (if any) with the given timestamp. */
	step(timestamp: number): void;
	/** Whether a frame is currently scheduled. */
	readonly pending: boolean;
}

/**
 * Install the manual-frame mock on `window`. Call per test that drives
 * `useRafFn` (or dependents like `useFps`).
 */
export function mockRaf(): ManualRaf {
	let frame: FrameRequestCallback | undefined;
	window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
		frame = callback;
		return 1;
	};
	window.cancelAnimationFrame = () => {
		frame = undefined;
	};
	return {
		step(timestamp: number) {
			const callback = frame;
			frame = undefined;
			callback?.(timestamp);
		},
		get pending() {
			return frame !== undefined;
		}
	};
}
