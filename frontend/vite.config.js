import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint2';
import string from 'vite-plugin-string';

export default defineConfig({
  plugins: [
    eslint(),
    string({ include: ['**/**/*.html'], exclude: ['index.html'] }),
  ],
  build: {
    target: 'es2020',
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
