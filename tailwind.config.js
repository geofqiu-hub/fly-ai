/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        claude: {
            bg: "#faf9f6",
            sidebar: "#f0efeb",
            accent: "#d97757",
            input: "#ffffff"
        }
      }
    },
  },
  plugins: [],
}