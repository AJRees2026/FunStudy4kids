/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fredoka', 'Inter', 'sans-serif'],
      },
      colors: {
        boy: {
          primary: '#1034A6',
          secondary: '#F97316',
        },
      },
    },
  },
  plugins: [],
}
