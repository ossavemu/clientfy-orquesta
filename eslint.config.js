import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.env', '*.log'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-multiple-empty-lines': ['error', { max: 1 }],
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      semi: ['error', 'always'],
      indent: ['error', 2],
      'comma-dangle': 'off',
      'object-curly-spacing': ['error', 'always'],
    },
  },
];
