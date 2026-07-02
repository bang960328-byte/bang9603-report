/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef1f7',
          100: '#d6dded',
          200: '#adbadb',
          300: '#8497c8',
          400: '#5b74b5',
          500: '#3d5798',
          600: '#2c3f78',
          700: '#1f2d59',
          800: '#16203f',
          900: '#0e1428',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
