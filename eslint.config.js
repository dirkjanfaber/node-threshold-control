'use strict'

const neostandard = require('neostandard')
const globals = require('globals')

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**', 'dist/**'] },
  ...neostandard({ ts: true }),
  {
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  },
  {
    files: ['**/*.js'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
]
