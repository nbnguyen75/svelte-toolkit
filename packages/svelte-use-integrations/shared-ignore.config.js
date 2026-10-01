export const FORMAT_IGNORE_PATTERNS = [
	// Package manager lock files
	'package-lock.json',
	'pnpm-lock.yaml',
	'yarn.lock',
	'bun.lock',
	'bun.lockb',

	// Static assets
	'/static/',

	// Build output & generated files (mirrors LINT_IGNORE_PATTERNS)
	'.svelte-kit',
	'dist',
	'build',
	'.vitest',
	'coverage',

	// Agent & AI tooling
	'.agents/',
	'.claude/',
	'.gemini/',
	'.opencode/'
];

export const LINT_IGNORE_PATTERNS = [
	// Dependencies & build output
	'**/node_modules',
	'**/.output',
	'**/.vercel',
	'**/.netlify',
	'**/.wrangler',
	'.svelte-kit',
	'build',
	'dist',

	// OS metadata
	'**/.DS_Store',
	'**/Thumbs.db',

	// Environment configurations
	'**/.env',
	'**/.env.*',
	'!**/.env.example',
	'!**/.env.test',

	// Tooling cache & timestamps
	'**/vite.config.js.timestamp-*',
	'**/vite.config.ts.timestamp-*',
	'**/.eslintcache'
];

export const SHARED_IGNORE_PATTERNS = [
	...new Set([...FORMAT_IGNORE_PATTERNS, ...LINT_IGNORE_PATTERNS])
];
