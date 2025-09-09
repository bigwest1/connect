import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0f14"
        },
        glass: {
          DEFAULT: "rgba(255,255,255,0.06)",
          stroke: "rgba(255,255,255,0.12)"
        }
      },
      backdropBlur: { xs: "2px" },
      boxShadow: {
        glass: "0 8px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;

