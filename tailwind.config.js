/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,tsx}',
    './components/**/*.{js,ts,tsx}',
    './hooks/**/*.{js,ts,tsx}',
    './constants/**/*.{js,ts,tsx}',
    './helpers/**/*.{js,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        salsa: ['Salsa-Regular'],
      },
    },
  },
  plugins: [],
};
