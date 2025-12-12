/** @type {import('prettier').Config} */
export default {
  semi: true,
  printWidth: 120,
  trailingComma: 'es5',
  singleQuote: true,
  jsxSingleQuote: false,
  tabWidth: 2,
  plugins: ['prettier-plugin-organize-imports'],
  organizeImportsSkipDestructiveCodeActions: true,
  overrides: [
    {
      files: 'tsconfig{,.*}.json',
      options: { parser: 'jsonc', trailingComma: 'none' },
    },
    {
      files: 'wrangler.jsonc',
      options: { parser: 'jsonc', trailingComma: 'none' },
    },
    {
      files: 'package.json5',
      options: { parser: 'json5', quoteProps: 'preserve', singleQuote: false, trailingComma: 'all' },
    },
  ],
};
