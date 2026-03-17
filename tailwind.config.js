/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#0f172a",
        gold: "#fbbf24", // WL Color
        diamond: "#22d3ee", // DL Color
      },
    },
  },
  plugins: [],
}