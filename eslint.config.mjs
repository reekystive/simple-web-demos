import cspellPlugin from '@cspell/eslint-plugin';
import { FlatCompat } from '@eslint/eslintrc';
import eslintJsPlugin from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import tsEslint from 'typescript-eslint';

/** @type {string[]} */
const TS_FILES = ['**/{,.}*.{,c,m}{j,t}s{,x}'];

/** @type {string[]} */
const STORYBOOK_FILES = ['**/{,.}*.stories.{,c,m}{j,t}s{,x}'];

/** @type {string[]} */
const STORYBOOK_MAIN_FILES = ['**/.storybook/main.{,c,m}{j,t}s'];

/** @type {string[]} */
const NEXTJS_FILES = ['apps/app-template-nextjs/src/**/{,.}*.{,c,m}{j,t}s{,x}'];

const flatCompat = new FlatCompat({
  baseDirectory: new URL('.', import.meta.url).pathname,
});

const typescriptConfigs = /** @type {import('eslint').Linter.Config[]} */ (
  tsEslint.config({
    plugins: {
      '@typescript-eslint': tsEslint.plugin,
    },
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.es2025 },
    },
    extends: [tsEslint.configs.strictTypeChecked, tsEslint.configs.stylisticTypeChecked],
  })
);

const nextjsTemplateAppPath = new URL('./apps/app-template-nextjs', import.meta.url);
const nextjsConfig = flatCompat.extends('next/core-web-vitals', 'next/typescript');

/**
 * @type {import('eslint').Linter.Config[]}
 */
const eslintConfig = [
  // config for all
  { ignores: ['**/node_modules/', '**/dist/', '**/storybook-static/', '**/.next/'] },
  { linterOptions: { reportUnusedDisableDirectives: true } },

  // config for javascript/typescript code
  {
    ...eslintJsPlugin.configs.recommended,
    files: TS_FILES,
  },
  ...typescriptConfigs.map((config) => ({
    ...config,
    files: TS_FILES,
  })),
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      react: reactPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
    settings: {
      react: { version: '19.1.0' },
    },
    files: TS_FILES,
  },
  {
    plugins: {
      storybook: /** @type {any} */ (storybook),
    },
    ...storybook.configs['flat/recommended'][2],
    files: STORYBOOK_MAIN_FILES,
  },
  {
    plugins: {
      storybook: /** @type {any} */ (storybook),
    },
    ...storybook.configs['flat/recommended'][1],
    files: STORYBOOK_FILES,
  },
  ...nextjsConfig.map((config) => ({
    ...config,
    files: NEXTJS_FILES,
  })),
  {
    rules: {
      '@next/next/no-html-link-for-pages': ['error', nextjsTemplateAppPath.pathname],
    },
    files: NEXTJS_FILES,
  },
  {
    ...eslintConfigPrettier,
    files: TS_FILES,
  },
  {
    plugins: { prettier: prettierPlugin },
    rules: { 'prettier/prettier': 'error' },
    files: TS_FILES,
  },
  {
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
    files: TS_FILES,
  },

  // config for all
  {
    plugins: { '@cspell': cspellPlugin },
    rules: {
      '@cspell/spellchecker': [
        'warn',
        /** @type {import('@cspell/eslint-plugin').Options} */ ({
          autoFix: true,
          generateSuggestions: true,
          numSuggestions: 3,
          configFile: fileURLToPath(new URL('./cspell.config.yaml', import.meta.url)),
        }),
      ],
    },
  },
];

export default eslintConfig;
