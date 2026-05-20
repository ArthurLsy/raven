/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Sans"', '"Inter"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "Menlo", "Monaco", "monospace"],
      },
    },
  },
  plugins: [],
};
