/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'sans-serif'],
      },
      colors: {
        forest: '#10443e',
        ink: '#173f3c',
        paper: '#f7f7f3',
        sand: '#fbf2dc',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(20, 54, 48, 0.06)',
      },
    },
  },
  plugins: [],
}
