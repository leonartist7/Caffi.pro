import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Coffee-themed color palette
        primary: {
          DEFAULT: '#6F4E37', // Coffee brown
          light: '#8B6F47',
          dark: '#3E2723',
        },
        accent: {
          DEFAULT: '#FF6B35', // Coral orange
          light: '#FF8C61',
        },
        background: '#FAFAF9', // Warm off-white
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F5F1ED', // Light cream
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config

