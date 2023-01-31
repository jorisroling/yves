module.exports = {
  extends: [
    'eslint:recommended',
    // 'plugin:jest/recommended'
  ],
  env: {
    'es6': true,
    'node': true,
  },
  parserOptions: {
    'ecmaVersion': 'latest',
    'sourceType': 'module',
  },
  globals: {
    'debug': true
  },
  rules: {
    semi: 'never',
    // 'no-unused-vars': ['error', {
    //   'args': 'none'
    // }],
    'space-infix-ops': [ 'error', { 'int32Hint': false } ],
    'space-in-parens': [ 'error', 'always' ],
    'object-curly-spacing': [ 'error', 'always' ],
    'array-bracket-spacing': [ 'error', 'always' ],
    'comma-spacing': [ 'error' ],
    'jest/no-commented-out-tests': 'off',
    'no-unused-vars': 'off',
    'no-inner-declarations': 0,
    'no-console': 0,
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'never'
    ]
  }
}
