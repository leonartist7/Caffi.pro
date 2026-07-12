module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'next/core-web-vitals',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@next/next/no-img-element': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-unescaped-entities': 'off',
    'react/jsx-no-undef': 'warn',
  },
  overrides: [
    {
      // TypeScript already checks undefined identifiers (and understands the
      // automatic JSX runtime); base no-undef only produces false positives.
      files: ['*.ts', '*.tsx'],
      rules: {
        'no-undef': 'off',
        // Base rule false-positives on TS type signatures (interface callback
        // params etc.). Unused locals are enforced by tsc (noUnusedLocals).
        'no-unused-vars': 'off',
      },
    },
  ],
}
