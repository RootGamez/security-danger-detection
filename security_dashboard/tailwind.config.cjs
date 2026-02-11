/***** Tailwind config for the security dashboard *****/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx,html}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"]
      },
      colors: {
        ink: {
          900: "#0f172a",
          800: "#111827"
        },
        accent: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0ea5e9"
        }
      },
      boxShadow: {
        glass: "0 25px 50px -12px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
};
