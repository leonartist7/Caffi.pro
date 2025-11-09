module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'next/core-web-vitals',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'admin-dashboard', 'mobile-app'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@next/next/no-img-element': 'off',
  },
}
