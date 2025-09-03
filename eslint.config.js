import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { 
    ignores: [
      'dist',
      'backups/**',
      'backend/backups/**',
      'node_modules/**',
      'build/**',
      'coverage/**',
      '*.log',
      '.env*',
      'tmp/**',
      'temp/**',
      // Escludo template GDPR dal lint generale (molto verboso e fuori scope)
      'src/templates/gdpr-entity-page/**'
    ] 
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Override mirato per i template GDPR (fuori dallo scope attuale):
  {
    files: ['src/templates/gdpr-entity-page/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }
);
