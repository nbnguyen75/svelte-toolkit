import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';

/** Step names for array steps are the step values; for records, their keys. */
export type UseStepName<Steps> = Steps extends readonly (infer Step)[]
	? Step
	: Steps extends Record<string, unknown>
		? keyof Steps
		: never;

/** Stepper state returned by {@link useStepper}. */
export interface UseStepperReturn<Name, Steps, Step> {
	/** Step at `index`, or `undefined` when out of range. */
	at: (index: number) => Step | undefined;
	/** Step called `step`, or `undefined` when unknown. */
	get: (step: Name) => Step | undefined;
	/** Whether `step` is the previous step. */
	isPrevious: (step: Name) => boolean;
	/** Previous step name, or `undefined` at the first step. Getter-backed. */
	readonly previous: Name | undefined;
	/** Current step value. Getter-backed. */
	readonly current: Step | undefined;
	/** Whether `step` is the current step. */
	isCurrent: (step: Name) => boolean;
	/** Whether the current step is before `step`. */
	isBefore: (step: Name) => boolean;
	/** Whether the current step is after `step`. */
	isAfter: (step: Name) => boolean;
	/** Whether `step` is the next step. */
	isNext: (step: Name) => boolean;
	/** Next step name, or `undefined` at the last step. Getter-backed. */
	readonly next: Name | undefined;
	/** Go back to `step`, but only when currently after it. */
	goBackTo: (step: Name) => void;
	/** Go to `step` (ignores unknown names). */
	goTo: (step: Name) => void;
	/** Ordered step names. Getter-backed. */
	readonly stepNames: Name[];
	/** Whether the current step is the first one. Getter-backed. */
	readonly isFirst: boolean;
	/** Go back unless already first. */
	goToPrevious: () => void;
	/** Whether the current step is the last one. Getter-backed. */
	readonly isLast: boolean;
	/** The steps definition. Getter-backed. */
	readonly steps: Steps;
	/** Go forward unless already last. */
	goToNext: () => void;
	/** Index of the current step. Getter/setter-backed. */
	index: number;
}

/**
 * Helpers for building multi-step wizard interfaces.
 *
 * @param steps Ordered steps: an array (names are the values) or a record
 *   (names are the keys).
 * @param initialStep Starting step name. Defaults to the first step.
 * @returns Current/next/previous step state plus navigation.
 * @example
 * ```ts
 * const stepper = useStepper(['intro', 'form', 'done'], 'form');
 * stepper.goToNext(); // 'done'
 * stepper.isLast; // true
 * ```
 */
export function useStepper<Step>(
	steps: MaybeGetter<Step[]>,
	initialStep?: Step
): UseStepperReturn<Step, Step[], Step>;
export function useStepper<Name extends string, Step>(
	steps: MaybeGetter<Record<Name, Step>>,
	initialStep?: Name
): UseStepperReturn<Name, Record<Name, Step>, Step>;
export function useStepper(
	steps: MaybeGetter<unknown[] | Record<string, unknown>>,
	initialStep?: unknown
): UseStepperReturn<unknown, unknown[] | Record<string, unknown>, unknown> {
	const readSteps = (): unknown[] | Record<string, unknown> => resolveGetter(steps);

	const names = $derived.by((): unknown[] => {
		const current = readSteps();
		return Array.isArray(current) ? [...current] : Object.keys(current);
	});

	let index = $state(Math.max(0, names.indexOf(initialStep ?? names[0])));

	function atStep(i: number): unknown {
		const current = readSteps();
		if (Array.isArray(current)) return current[i];
		const name = names[i];
		return typeof name === 'string' ? current[name] : undefined;
	}

	const position = (step: unknown): number => names.indexOf(step);

	const current = $derived(atStep(index));
	const isFirst = $derived(index === 0);
	const isLast = $derived(index === names.length - 1);
	const next = $derived(names[index + 1]);
	const previous = $derived(names[index - 1]);

	return {
		get steps() {
			return readSteps();
		},
		get stepNames() {
			return names;
		},
		get index() {
			return index;
		},
		set index(nextIndex: number) {
			index = nextIndex;
		},
		get current() {
			return current;
		},
		get next() {
			return next;
		},
		get previous() {
			return previous;
		},
		get isFirst() {
			return isFirst;
		},
		get isLast() {
			return isLast;
		},
		at: atStep,
		get(step: unknown) {
			const i = position(step);
			return i < 0 ? undefined : atStep(i);
		},
		goTo(step: unknown) {
			const i = position(step);
			if (i >= 0) index = i;
		},
		goToNext() {
			if (!isLast) index += 1;
		},
		goToPrevious() {
			if (!isFirst) index -= 1;
		},
		goBackTo(step: unknown) {
			const i = position(step);
			if (i >= 0 && index > i) index = i;
		},
		isNext(step: unknown) {
			return position(step) === index + 1;
		},
		isPrevious(step: unknown) {
			return position(step) === index - 1;
		},
		isCurrent(step: unknown) {
			return position(step) === index;
		},
		isBefore(step: unknown) {
			return index < position(step);
		},
		isAfter(step: unknown) {
			return index > position(step);
		}
	};
}
