/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ubc: {
          blue: '#002145',
          'blue-light': '#003A70',
          'blue-dark': '#001429',
          gold: '#FFD700',
          'gold-light': '#FFE55C',
          'gold-dark': '#CCAA00',
        },
        primary: {
          50: '#E6EBF0',
          100: '#CCD7E1',
          200: '#99AFC3',
          300: '#6687A5',
          400: '#335F87',
          500: '#002145',
          600: '#001A37',
          700: '#001429',
          800: '#000D1C',
          900: '#00060F',
        },
      },
    },
  },
  plugins: [],
}

