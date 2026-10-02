# `useStepper`

Helpers for building multi-step wizard interfaces. Inspired by [VueUse `useStepper`](https://vueuse.org/shared/useStepper/).

## Signature

```ts
import { useStepper } from '@wynn-dev/svelte-use';

const stepper = useStepper(['intro', 'form', 'done'], 'form');
```

## Parameters

| Parameter     | Type                               | Default    | Description                                                      |
| ------------- | ---------------------------------- | ---------- | ---------------------------------------------------------------- |
| `steps`       | `MaybeGetter<T[] \| Record<N, T>>` | —          | Ordered steps. Arrays use the values as names; records use keys. |
| `initialStep` | step name                          | first step | Starting step. Unknown names fall back to the first step.        |

## Returns

| Field          | Type                                   | Description                                          |
| -------------- | -------------------------------------- | ---------------------------------------------------- |
| `steps`        | `Steps`                                | The steps definition. Getter-backed.                 |
| `stepNames`    | `Name[]`                               | Ordered step names. Getter-backed.                   |
| `index`        | `number`                               | Index of the current step. Getter/setter-backed.     |
| `current`      | `Step \| undefined`                    | Current step value. Getter-backed.                   |
| `next`         | `Name \| undefined`                    | Next step name. Getter-backed.                       |
| `previous`     | `Name \| undefined`                    | Previous step name. Getter-backed.                   |
| `isFirst`      | `boolean`                              | Whether this is the first step. Getter-backed.       |
| `isLast`       | `boolean`                              | Whether this is the last step. Getter-backed.        |
| `goTo`         | `(step: Name) => void`                 | Go to `step`; unknown names are ignored.             |
| `goToNext`     | `() => void`                           | Go forward unless already last.                      |
| `goToPrevious` | `() => void`                           | Go back unless already first.                        |
| `goBackTo`     | `(step: Name) => void`                 | Go back to `step`, but only when currently after it. |
| `isCurrent`    | `(step: Name) => boolean`              | Whether `step` is the current step.                  |
| `isNext`       | `(step: Name) => boolean`              | Whether `step` is the next step.                     |
| `isPrevious`   | `(step: Name) => boolean`              | Whether `step` is the previous step.                 |
| `isBefore`     | `(step: Name) => boolean`              | Whether the current step is before `step`.           |
| `isAfter`      | `(step: Name) => boolean`              | Whether the current step is after `step`.            |
| `get`          | `(step: Name) => Step \| undefined`    | Look a step up by name.                              |
| `at`           | `(index: number) => Step \| undefined` | Look a step up by index.                             |

Navigation never escapes the range: `goToNext` stops at the last step and
`goToPrevious` stops at the first.

## Examples

### Array steps

```svelte
<script lang="ts">
	import { useStepper } from '@wynn-dev/svelte-use';

	const stepper = useStepper(['intro', 'form', 'done']);
</script>

{#each stepper.stepNames as name, index}
	<p class:active={stepper.isCurrent(name)}>{index + 1}. {name}</p>
{/each}

<button onclick={() => stepper.goToPrevious()} disabled={stepper.isFirst}>Back</button>
<button onclick={() => stepper.goToNext()} disabled={stepper.isLast}>Next</button>
```

### Record steps

```svelte
<script lang="ts">
	import { useStepper } from '@wynn-dev/svelte-use';

	const stepper = useStepper({
		intro: 'Tell us about yourself',
		form: 'Fill in the form',
		done: 'All set'
	});
</script>

<h2>{stepper.current}</h2><p>Step {stepper.index + 1} of {stepper.stepNames.length}</p>
```

### Allowing backward-only jumps

```svelte
<script lang="ts">
	import { useStepper } from '@wynn-dev/svelte-use';

	const stepper = useStepper(['a', 'b', 'c', 'd'], 'd');

	// Lets the user retry a failed step, but never skip ahead.
	stepper.goBackTo('b');
</script>
```

## SSR

Safe to construct on the server: no browser API. `$derived` works server-side, so
all step state is correct on first render.
