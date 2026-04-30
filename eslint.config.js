'use strict'

const neostandard = require('neostandard')
const globals = require('globals')

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**'] },
  ...neostandard(),
  {
    languageOptions: {
      globals: {
        ...globals.jest
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
]
