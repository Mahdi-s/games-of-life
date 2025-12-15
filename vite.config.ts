import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Workspace packages export TS entrypoints (./src/index.ts). For SSR dev,
	// we must ensure Vite bundles/transpiles them instead of Node trying to load
	// raw `.ts` (which causes ERR_UNKNOWN_FILE_EXTENSION).
	ssr: {
		noExternal: ['@games-of-life/core', '@games-of-life/webgpu', '@games-of-life/svelte']
	},
	server: {
		fs: {
			// Allow importing workspace packages from /packages during local dev.
			// Without this, Vite may block requests as "outside of Vite serving allow list".
			allow: [path.resolve(__dirname, 'packages'), path.resolve(__dirname)]
		}
	}
});
