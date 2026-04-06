/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'abhimata-orange': '#FF6B35',
        'abhimata-orange-light': '#FF8A65',
        'abhimata-orange-dark': '#E64A19',
      }
    },
  },
  plugins: [],
}
