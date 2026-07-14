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
        haze: {
          DEFAULT: "#647D9C",
          50: "#F3F6F8",
          100: "#E4EAF0",
          200: "#C7D3E0",
          300: "#A6B9CC",
          400: "#8399B3",
          500: "#647D9C",
          600: "#4F6580",
          700: "#3D4F65",
          800: "#2B394A",
          900: "#1A222D",
        },
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(47, 74, 60, 0.04), 0 4px 24px rgba(47, 74, 60, 0.08)",
        "soft-md":
          "0 2px 8px rgba(47, 74, 60, 0.06), 0 14px 34px rgba(47, 74, 60, 0.10)",
        "soft-lg":
          "0 4px 16px rgba(47, 74, 60, 0.08), 0 24px 48px rgba(47, 74, 60, 0.14)",
        "soft-up": "0 -8px 30px rgba(47, 74, 60, 0.10)",
        "inset-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.65)",
        card: "inset 0 1px 0 0 rgba(255, 255, 255, 0.7), 0 1px 2px rgba(47, 74, 60, 0.04), 0 10px 30px rgba(47, 74, 60, 0.08)",
        "card-hover":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.7), 0 2px 6px rgba(47, 74, 60, 0.06), 0 18px 40px rgba(47, 74, 60, 0.13)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
