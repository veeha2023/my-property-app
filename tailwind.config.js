/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#FFD700', // Gold/Yellow color (client view)
        // Veeha brand (from veeha.co theme) — admin + login
        brand: { DEFAULT: '#FFE401', 50: '#FFFDE6', 100: '#FFF9C2', 600: '#E6CD00', 800: '#7A6500' },
        ink: { DEFAULT: '#202124', 700: '#3A3B40', 800: '#2B2C30', 900: '#161616' },
        pop: { DEFAULT: '#D6006A' }, // veeha.co accent #F00073, darkened for AA with white text
      },
      fontFamily: {
        brand: ['Quicksand', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
