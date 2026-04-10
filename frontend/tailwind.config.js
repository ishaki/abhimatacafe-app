/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'abhimata-orange': '#A0826D',
        'abhimata-orange-light': '#C4A98E',
        'abhimata-orange-dark': '#7B5E4B',
      }
    },
  },
  plugins: [],
}
