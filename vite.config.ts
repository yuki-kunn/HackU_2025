import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	ssr: {noExternal: ['@googlemaps/js-api-loader']},
	plugins: [sveltekit(), tailwindcss()]
});
