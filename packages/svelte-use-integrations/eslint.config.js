// @ts-check

import path from 'node:path';

import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import { includeIgnoreFile, defineConfig } from 'eslint/config';
import ts from 'typescript-eslint';

import { LINT_IGNORE_PATTERNS } from './shared-ignore.config.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		ignores: LINT_IGNORE_PATTERNS
	},
	svelte.configs.recommended,
	svelte.configs.prettier,
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here
		rules: {}
	},
	{
		rules: {
			'perfectionist/sort-imports': [
				'warn',
				{
					customGroups: [
						{
							/* Svelte core */
							elementNamePattern: ['^svelte$', '^svelte/.*$', '^@sveltejs/.*$'],
							groupName: 'framework',
							modifiers: ['value']
						},
						{
							/* Browser utilities */
							elementNamePattern: '^\\$lib/browser/.*$',
							modifiers: ['value'],
							groupName: 'browser'
						},
						{
							/* State utilities */
							elementNamePattern: '^\\$lib/state/.*$',
							modifiers: ['value'],
							groupName: 'state'
						},
						{
							/* General utilities */
							elementNamePattern: '^\\$lib/utilities/.*$',
							modifiers: ['value'],
							groupName: 'utilities'
						},
						{
							/* Shared helpers */
							elementNamePattern: '^\\$lib/shared/.*$',
							modifiers: ['value'],
							groupName: 'shared'
						},
						{
							/* CSS */
							elementNamePattern: '^.+\\.css$',
							modifiers: ['value'],
							groupName: 'assets'
						}
					],
					groups: [
						'type',
						'builtin',
						'framework',
						'external',
						'browser',
						'state',
						'utilities',
						'shared',
						'parent',
						'sibling',
						'index',
						'assets',
						'side-effect-style',
						'style',
						'import'
					]
				}
			],
			'perfectionist/sort-named-imports': ['warn', { type: 'line-length', order: 'desc' }],
			'perfectionist/sort-named-exports': ['warn', { type: 'line-length', order: 'desc' }],
			'perfectionist/sort-exports': ['warn', { type: 'line-length', order: 'desc' }],
			'perfectionist/sort-enums': ['warn', { type: 'line-length', order: 'desc' }],
			'perfectionist/sort-interfaces': ['warn', { type: 'line-length', order: 'desc' }],
			'perfectionist/sort-object-types': ['warn', { type: 'line-length', order: 'desc' }]
		},
		plugins: { perfectionist }
	}
);
