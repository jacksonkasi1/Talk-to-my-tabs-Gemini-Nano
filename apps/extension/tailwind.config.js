/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
   darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./src/**/*.{tsx,ts,jsx,js}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}