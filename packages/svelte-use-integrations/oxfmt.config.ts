import { defineConfig } from 'oxfmt';
import { FORMAT_IGNORE_PATTERNS } from './shared-ignore.config.js';

export default defineConfig({
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	sortPackageJson: false,
	svelte: {},
	ignorePatterns: FORMAT_IGNORE_PATTERNS
});
