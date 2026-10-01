import { defineConfig } from 'oxlint';
import { LINT_IGNORE_PATTERNS } from './shared-ignore.config.ts';

export default defineConfig({
	plugins: ['eslint', 'typescript', 'unicorn', 'import'],
	jsPlugins: ['eslint-plugin-svelte'],
	options: {
		typeAware: true
	},
	categories: {
		correctness: 'error',
		suspicious: 'warn',
		pedantic: 'off',
		style: 'off'
	},
	env: {
		builtin: true,
		browser: true,
		node: true
	},
	globals: {
		AudioSession: 'readonly',
		HTMLCameraElement: 'readonly',
		HTMLMicrophoneElement: 'readonly',
		MathMLAnchorElement: 'readonly',
		NodeRange: 'readonly',
		OpaqueRange: 'readonly',
		requestResize: 'readonly',
		TrustedParserOptions: 'readonly'
	},
	ignorePatterns: LINT_IGNORE_PATTERNS,
	rules: {
		// =========================================================================
		// JavaScript / Core ESLint Rules
		// =========================================================================

		// Possible Errors & Control Flow
		'constructor-super': 'error',
		'for-direction': 'error',
		'getter-return': 'error',
		'no-async-promise-executor': 'error',
		'no-compare-neg-zero': 'error',
		'no-cond-assign': 'error',
		'no-const-assign': 'error',
		'no-constant-binary-expression': 'error',
		'no-constant-condition': 'error',
		'no-control-regex': 'error',
		'no-debugger': 'error',
		'no-dupe-class-members': 'error',
		'no-dupe-else-if': 'error',
		'no-dupe-keys': 'error',
		'no-duplicate-case': 'error',
		'no-empty-character-class': 'error',
		'no-empty-pattern': 'error',
		'no-empty-static-block': 'error',
		'no-ex-assign': 'error',
		'no-fallthrough': 'error',
		'no-func-assign': 'error',
		'no-import-assign': 'error',
		'no-invalid-regexp': 'error',
		'no-irregular-whitespace': 'error',
		'no-loss-of-precision': 'error',
		'no-misleading-character-class': 'error',
		'no-new-native-nonconstructor': 'error',
		'no-nonoctal-decimal-escape': 'error',
		'no-obj-calls': 'error',
		'no-prototype-builtins': 'error',
		'no-self-assign': 'error',
		'no-setter-return': 'error',
		'no-sparse-arrays': 'error',
		'no-this-before-super': 'error',
		'no-unreachable': 'error',
		'no-unsafe-finally': 'error',
		'no-unsafe-negation': 'error',
		'no-unsafe-optional-chaining': 'error',
		'require-yield': 'error',
		'use-isnan': 'error',
		'valid-typeof': 'error',

		// Best Practices & Variables
		'no-array-constructor': 'error',
		'no-case-declarations': 'error',
		'no-class-assign': 'error',
		'no-delete-var': 'error',
		'no-empty': 'error',
		'no-extra-boolean-cast': 'error',
		'no-global-assign': 'error',
		'no-redeclare': 'error',
		'no-regex-spaces': 'error',
		'no-shadow-restricted-names': 'error',
		'no-unassigned-vars': 'error',
		'no-unused-expressions': 'error',
		'no-unused-labels': 'error',
		'no-unused-private-class-members': 'error',
		'no-unused-vars': 'error',
		'no-useless-assignment': 'error',
		'no-useless-backreference': 'error',
		'no-useless-catch': 'error',
		'no-useless-escape': 'error',
		'no-with': 'error',
		'preserve-caught-error': 'error',

		// =========================================================================
		// Svelte Rules (eslint-plugin-svelte)
		// =========================================================================

		// Reactivity, Runes & Infinite Loops
		'svelte/infinite-reactive-loop': 'error',
		'svelte/no-immutable-reactive-statements': 'error',
		'svelte/no-reactive-functions': 'error',
		'svelte/no-reactive-literals': 'error',
		'svelte/no-reactive-reassign': 'error',
		'svelte/no-unnecessary-state-wrap': 'error',
		'svelte/prefer-svelte-reactivity': 'error',
		'svelte/prefer-writable-derived': 'error',

		// Store & Async Usage
		'svelte/no-store-async': 'error',
		'svelte/require-store-reactive-access': 'error',

		// Template Syntax, Snippets & Directives
		'svelte/comment-directive': 'error',
		'svelte/no-at-html-tags': 'error',
		'svelte/no-dupe-else-if-blocks': 'error',
		'svelte/no-dupe-on-directives': 'error',
		'svelte/no-dupe-style-properties': 'error',
		'svelte/no-dupe-use-directives': 'error',
		'svelte/no-not-function-handler': 'error',
		'svelte/no-object-in-text-mustaches': 'error',
		'svelte/no-shorthand-style-property-overrides': 'error',
		'svelte/no-unknown-style-directive-property': 'error',
		'svelte/no-unused-props': 'error',
		'svelte/no-unused-svelte-ignore': 'error',
		'svelte/no-useless-children-snippet': 'error',
		'svelte/no-useless-mustaches': 'error',
		'svelte/require-each-key': 'error',
		'svelte/valid-each-key': 'error',

		// DOM, Events & Special Elements
		'svelte/no-dom-manipulating': 'error',
		'svelte/no-raw-special-elements': 'error',
		'svelte/no-svelte-internal': 'error',
		'svelte/require-event-dispatcher-types': 'error',
		'svelte/system': 'error',

		// SvelteKit Routing & Page Conventions
		'svelte/no-export-load-in-svelte-module-in-kit-pages': 'error',
		'svelte/no-navigation-without-resolve': 'error',
		'svelte/valid-prop-names-in-kit-pages': 'error',

		// Inspection & Debugging
		'svelte/no-at-debug-tags': 'warn',
		'svelte/no-inner-declarations': 'error',
		'svelte/no-inspect': 'warn',

		// =========================================================================
		// TypeScript Rules (@typescript-eslint)
		// =========================================================================

		// Strict Types & Prohibitions
		'typescript/ban-ts-comment': [
			'error',
			{
				'ts-expect-error': 'allow-with-description',
				'ts-ignore': false
			}
		],
		'typescript/no-duplicate-enum-values': 'error',
		'typescript/no-empty-object-type': 'error',
		'typescript/no-explicit-any': 'error',
		'typescript/no-extra-non-null-assertion': 'error',
		'typescript/no-misused-new': 'error',
		'typescript/no-namespace': 'error',
		'typescript/no-non-null-asserted-optional-chain': 'error',
		'typescript/no-require-imports': 'error',
		'typescript/no-this-alias': 'error',
		'typescript/no-unnecessary-type-constraint': 'error',
		'typescript/no-unsafe-declaration-merging': 'error',
		'typescript/no-unsafe-function-type': 'error',
		'typescript/no-wrapper-object-types': 'error',

		// Idiomatic Typing & Import Conventions
		'typescript/prefer-as-const': 'error',
		'typescript/prefer-namespace-keyword': 'error',
		'typescript/triple-slash-reference': 'error',
		'typescript/consistent-type-imports': [
			'error',
			{
				prefer: 'type-imports',
				fixStyle: 'separate-type-imports'
			}
		],

		// =========================================================================
		// Async Safety, Precision & Hygiene (type-aware where marked)
		// =========================================================================

		'no-console': ['error', { allow: ['warn', 'error'] }],

		// Floating / misused promises: silently dropped async failures
		'typescript/no-floating-promises': 'error',
		'typescript/no-misused-promises': 'error',

		// Unsafe any-propagation through async boundaries
		'typescript/no-unsafe-member-access': 'error',
		'typescript/no-unsafe-argument': 'error',
		'typescript/no-unsafe-return': 'error',
		'typescript/no-unsafe-type-assertion': 'error',
		'typescript/no-unsafe-assignment': 'warn',
		'typescript/no-unsafe-call': 'warn',

		// Dead code & precision
		'typescript/no-unnecessary-condition': 'error',
		'typescript/no-unnecessary-type-assertion': 'error',
		'typescript/no-for-in-array': 'error',
		'typescript/no-inferrable-types': [
			'error',
			{
				ignoreParameters: true
			}
		],
		'typescript/method-signature-style': ['error', 'property'],
		'typescript/only-throw-error': 'error',
		'typescript/require-await': 'warn',
		'typescript/prefer-for-of': 'warn',

		// Import hygiene
		'import/no-duplicates': 'error',
		'import/no-commonjs': 'error',

		// Unicorn mutation & scoping guards
		'unicorn/no-array-reverse': 'warn',
		'unicorn/no-array-sort': 'warn',
		'unicorn/consistent-function-scoping': 'warn',
		'unicorn/throw-new-error': 'warn',
		'unicorn/prefer-number-properties': 'warn',
		'unicorn/prefer-node-protocol': 'error'
	},
	overrides: [
		{
			// Plain-JS tooling glue sits outside the TS program, so type-aware
			// rules only see `error` types here. Syntax rules still apply.
			files: ['*.config.js'],
			rules: {
				'typescript/no-unsafe-member-access': 'off',
				'typescript/no-unsafe-argument': 'off',
				'typescript/no-unsafe-return': 'off',
				'typescript/no-unsafe-type-assertion': 'off',
				'typescript/no-unsafe-assignment': 'off',
				'typescript/no-unsafe-call': 'off'
			}
		},
		{
			// Barrel placeholder until the first port lands its exports.
			files: ['src/lib/index.ts'],
			rules: {
				'unicorn/no-empty-file': 'off'
			}
		},
		{
			files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
			rules: {
				'constructor-super': 'off',
				'getter-return': 'off',
				'no-class-assign': 'off',
				'no-const-assign': 'off',
				'no-dupe-class-members': 'off',
				'no-dupe-keys': 'off',
				'no-func-assign': 'off',
				'no-import-assign': 'off',
				'no-new-native-nonconstructor': 'off',
				'no-obj-calls': 'off',
				'no-redeclare': 'off',
				'no-setter-return': 'off',
				'no-this-before-super': 'off',
				'no-unreachable': 'off',
				'no-unsafe-negation': 'off',
				'no-var': 'error',
				'no-with': 'off',
				'prefer-const': 'error',
				'prefer-rest-params': 'error',
				'prefer-spread': 'error'
			}
		},
		{
			files: ['*.svelte', '**/*.svelte'],
			rules: {
				'no-inner-declarations': 'off',
				'no-self-assign': 'off',
				'no-useless-escape': 'off'
			},
			jsPlugins: ['eslint-plugin-svelte']
		}
	]
});
