/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0F1B2D',
          light: '#16253C',
          lighter: '#1E2D42',
        },
        sand: '#F6F4EF',
        gold: {
          DEFAULT: '#D9A441',
          light: '#F0C36D',
        },
        teal: {
          DEFAULT: '#2E9C8F',
          light: '#4CBBAD',
        },
        rust: '#C1573A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
