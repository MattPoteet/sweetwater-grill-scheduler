/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#14201f',
        ink: '#21302e',
        cream: '#fff8ea',
        paper: '#fffdf7',
        teal: '#1d8d99',
        green: '#4f8f48',
        gold: '#d8962f',
        orange: '#c96f32',
      },
      boxShadow: {
        soft: '0 14px 40px rgba(20, 32, 31, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
