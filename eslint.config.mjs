import eslintJsPlugin from '@eslint/js';
import next from '@next/eslint-plugin-next';
import eslintConfigPrettier from 'eslint-config-prettier';
import * as mdx from 'eslint-plugin-mdx';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';
import tsEslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

/** @type {string[]} */
const MDX_FILES = ['**/{,.}*.mdx'];

/** @type {string[]} */
const MDX_VIRTUAL_TS_FILES = ['**/{,.}*.mdx/**/{,.}*.{,c,m}{j,t}s{,x}'];

/** @type {string[]} */
const TS_FILES = ['**/{,.}*.{,c,m}{j,t}s{,x}'];

/** @type {string[]} */
const STORYBOOK_FILES = ['**/{,.}*.stories.{,c,m}{j,t}s{,x}'];

/** @type {string[]} */
const STORYBOOK_MAIN_FILES = ['**/.storybook/main.{,c,m}{j,t}s'];

/** @type {string[]} */
const NEXTJS_FILES = ['apps/app-template-nextjs/src/**/{,.}*.{,c,m}{j,t}s{,x}'];

const nextjsTemplateAppPath = new URL('./apps/app-template-nextjs/', import.meta.url);
const storybookAppPath = new URL('./apps-web/app-storybook/', import.meta.url);

/**
 * @type {import('eslint').Linter.Config[]}
 */
const eslintConfig = [
  // config for all
  { ignores: ['**/node_modules/', '**/dist/', '**/storybook-static/', '**/.next/'] },
  { linterOptions: { reportUnusedDisableDirectives: true } },

  // parser for javascript/typescript code
  {
    languageOptions: {
      parser: /** @type {any} */ (tsEslint.parser),
      parserOptions: /** @satisfies {import('@typescript-eslint/types').ParserOptions} */ ({
        projectService: true,
      }),
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: TS_FILES,
  },

  // config for javascript/typescript code
  {
    rules: {
      ...eslintJsPlugin.configs.recommended.rules,
      'no-undef': 'off',
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: TS_FILES,
  },
  {
    plugins: {
      '@typescript-eslint': /** @type {any} */ (tsEslint.plugin),
    },
    rules: {
      ...tsEslint.configs.strictTypeChecked[2]?.rules,
      ...tsEslint.configs.stylisticTypeChecked[2]?.rules,
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: TS_FILES,
  },
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      react: reactPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
    settings: {
      react: { version: '19.1.0' },
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: TS_FILES,
  },

  // config for storybook files
  {
    plugins: {
      storybook: /** @type {any} */ (storybook),
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: [STORYBOOK_FILES, STORYBOOK_MAIN_FILES],
  },
  {
    rules: {
      ...storybook.configs['flat/recommended'][1]?.rules,
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: STORYBOOK_FILES,
  },
  {
    rules: {
      ...storybook.configs['flat/recommended'][2]?.rules,
      'storybook/no-uninstalled-addons': [
        'error',
        { packageJsonLocation: fileURLToPath(new URL('package.json', storybookAppPath)) },
      ],
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: STORYBOOK_MAIN_FILES,
  },

  // config for nextjs
  {
    plugins: {
      '@next/next': /** @type {any} */ (next.flatConfig.recommended.plugins['@next/next']),
    },
    rules: {
      .../** @type {Record<string, import('eslint').Linter.RuleEntry>} */ (next.flatConfig.recommended.rules),
      .../** @type {Record<string, import('eslint').Linter.RuleEntry>} */ (next.flatConfig.coreWebVitals.rules),
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: NEXTJS_FILES,
  },
  {
    rules: {
      '@next/next/no-html-link-for-pages': ['error', fileURLToPath(nextjsTemplateAppPath)],
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: NEXTJS_FILES,
  },

  // config for javascript/typescript code
  {
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
    ignores: MDX_VIRTUAL_TS_FILES,
    files: TS_FILES,
  },

  // prettier config
  {
    // disable internal eslint rules that might conflict with prettier
    rules: eslintConfigPrettier.rules,
    ignores: MDX_VIRTUAL_TS_FILES,
    files: TS_FILES,
  },
  {
    plugins: { prettier: prettierPlugin },
    files: [...TS_FILES, ...MDX_FILES, ...MDX_VIRTUAL_TS_FILES],
  },
  {
    rules: { 'prettier/prettier': 'error' },
    files: [...TS_FILES, ...MDX_FILES, ...MDX_VIRTUAL_TS_FILES],
  },

  // config for mdx
  {
    plugins: { mdx: mdx },
    languageOptions: mdx.flat.languageOptions,
    processor: mdx.createRemarkProcessor({ lintCodeBlocks: true }),
    rules: {
      ...mdx.flat.rules,
    },
    files: MDX_FILES,
  },

  // config for mdx code blocks (disabled for now)
  {
    languageOptions: {
      parserOptions: {
        ...mdx.flatCodeBlocks.languageOptions?.parserOptions,
      },
    },
    rules: {
      ...mdx.flatCodeBlocks.rules,
    },
    files: MDX_VIRTUAL_TS_FILES,
  },
];

export default eslintConfig;
