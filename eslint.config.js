import js from '@eslint/js'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
        debug: true,
      },
    },
    rules: {
      'no-control-regex': 'off',
      'no-useless-assignment': 'off',
      'no-unused-vars': 'off',
      'no-inner-declarations': 0,
      'no-console': 0,
      'indent': [ 'error', 2 ],
      'linebreak-style': [ 'error', 'unix' ],
      'quotes': [ 'error', 'single' ],
      'semi': [ 'error', 'never' ],
    },
  },
  {
    ignores: [ 'dist/**' ],
  },
]
