import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Futuristic Coffee Theme
        coffee: {
          50: '#fdf8f3',
          100: '#f7ede3',
          200: '#eed9c4',
          300: '#e3bf9b',
          400: '#d69f70',
          500: '#c97d47',
          600: '#b8632f',
          700: '#8b4513',
          800: '#6b3410',
          900: '#4a240b',
          950: '#2d1607',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#faf3e8',
          300: '#f5ebd9',
          400: '#ede0c8',
          500: '#e3d2b3',
          600: '#d4bc95',
          700: '#c0a478',
          800: '#a98b5f',
          900: '#8b7249',
        },
        // Dark mode colors
        dark: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9de',
          300: '#b8b9c1',
          400: '#92939f',
          500: '#747583',
          600: '#5e5f6b',
          700: '#4d4e57',
          800: '#42434a',
          900: '#1a1b1e',
          950: '#0a0a0b',
        },
        // Accent colors
        espresso: '#4a240b',
        latte: '#d69f70',
        mocha: '#6b3410',
        foam: '#fdf8f3',
        // primary/accent were referenced all over but never defined (buttons
        // rendered transparent). Warm placeholders until the aro token port
        // in Phase 3 (terra/espresso/cream from AURA/app/aura-landing.css).
        primary: {
          DEFAULT: '#8b4513',
          dark: '#6b3410',
        },
        accent: '#c97d47',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-coffee': 'linear-gradient(135deg, #6b3410 0%, #4a240b 100%)',
        'gradient-cream': 'linear-gradient(135deg, #fdf8f3 0%, #eed9c4 100%)',
        'glass-light':
          'linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3))',
        'glass-dark': 'linear-gradient(135deg, rgba(26, 27, 30, 0.7), rgba(26, 27, 30, 0.3))',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(214, 159, 112, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(214, 159, 112, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
