import { defineConfig } from 'vitest/config';

const packageAlias = (name: string) => new URL(`./packages/${name}/src/index.ts`, import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: {
      '@gspl/text-source': packageAlias('text-source'),
      '@gspl/syntax-tree': packageAlias('syntax-tree'),
    },
  },
  test: {
    environment: 'node',
  },
});
