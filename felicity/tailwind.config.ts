import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#2F4A3C",
          50: "#EDF2EF",
          100: "#D7E3DB",
          200: "#B0C7B8",
          300: "#88AB94",
          400: "#5F8F71",
          500: "#3E6D50",
          600: "#2F4A3C",
          700: "#243A2F",
          800: "#192921",
          900: "#0E1814",
        },
        walnut: {
          DEFAULT: "#6B4A34",
          50: "#F2ECE7",
          100: "#E1D2C5",
          200: "#C6AB92",
          300: "#AB845F",
          400: "#8C6746",
          500: "#6B4A34",
          600: "#563B29",
          700: "#412C1F",
          800: "#2C1D15",
          900: "#170F0A",
        },
        cream: {
          DEFAULT: "#F7F1E6",
          50: "#FEFDFB",
          100: "#F7F1E6",
          200: "#EFE4CC",
          300: "#E6D6AD",
        },
        linen: "#EFE7D8",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(47, 74, 60, 0.08)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
