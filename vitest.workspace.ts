import { defineWorkspace } from 'vitest/config';

const packageAlias = (name) => new URL(`./packages/${name}/src/index.ts`, import.meta.url).pathname;

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'lexer',
      include: ['packages/lexer/**/*.test.ts'],
      environment: 'node',
    },
    resolve: {
      alias: {
        '@gspl/text-source': packageAlias('text-source'),
        '@gspl/syntax-tree': packageAlias('syntax-tree'),
      },
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'text-source',
      include: ['packages/text-source/**/*.test.ts'],
      environment: 'node',
    },
    resolve: {
      alias: {
        '@gspl/text-source': packageAlias('text-source'),
        '@gspl/syntax-tree': packageAlias('syntax-tree'),
      },
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'syntax-tree',
      include: ['packages/syntax-tree/**/*.test.ts'],
      environment: 'node',
    },
    resolve: {
      alias: {
        '@gspl/text-source': packageAlias('text-source'),
        '@gspl/syntax-tree': packageAlias('syntax-tree'),
      },
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'parser',
      include: ['packages/parser/**/*.test.ts'],
      environment: 'node',
    },
    resolve: {
      alias: {
        '@gspl/text-source': packageAlias('text-source'),
        '@gspl/syntax-tree': packageAlias('syntax-tree'),
        '@gspl/lexer': packageAlias('lexer'),
      },
    },
  },
]);
