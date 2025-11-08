/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f9',
          100: '#d9f0ef',
          200: '#b7e2e0',
          300: '#88ccc9',
          400: '#5ab1ad',
          500: '#3f9693',
          600: '#2d5f5d',
          700: '#285552',
          800: '#244645',
          900: '#223c3b',
        },
        accent: {
          50: '#fef6ee',
          100: '#fdebd8',
          200: '#fbd4b0',
          300: '#f8b77d',
          400: '#f4a259',
          500: '#f07d29',
          600: '#e15e1e',
          700: '#bb4517',
          800: '#953819',
          900: '#783018',
        },
      },
    },
  },
  plugins: [],
}
