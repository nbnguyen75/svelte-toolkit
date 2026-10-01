import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Resolve `browser` first so dual-build deps (notably `svelte`) pick
	// their client build in every pipeline, including the SSR transform
	// Vitest runs test files through.
	resolve: {
		conditions: ['browser', 'module', 'node', 'development', 'production', 'default']
	},
	plugins: [
		svelte({
			compilerOptions: {
				// Mirror vite.config.ts: force runes mode for first-party code.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			}
		})
	],
	test: {
		// Isomorphic default: no DOM globals. Browser tests opt in per file with:
		//   // @vitest-environment jsdom
		environment: 'node',
		exclude: ['node_modules', 'dist', '.svelte-kit'],
		include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
		restoreMocks: true,
		setupFiles: ['./test/setup.ts'],
		// Inline `svelte` so bare imports (mount/unmount/tick) resolve to the
		// client build. Otherwise Vitest externalizes the package to Node,
		// which picks the server build where mount() throws.
		server: {
			deps: {
				inline: ['svelte']
			}
		}
	}
});
