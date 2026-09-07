import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f4f6f8",
          100: "#e6ebf0",
          200: "#c5d0db",
          300: "#93a6b8",
          400: "#5f7890",
          500: "#3d566e",
          600: "#2b4054",
          700: "#1d2d3d",
          800: "#13202d",
          900: "#0c1620",
          950: "#070d13",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.06), 0 8px 24px rgba(16, 24, 40, 0.06)",
        pop: "0 12px 40px rgba(12, 22, 32, 0.18)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
