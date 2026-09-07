import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: "#fbf7f0",
          100: "#f4eee3",
          200: "#e8dcc8",
        },
        cove: {
          ink: "#243038",
          mute: "#5c6b74",
          teal: "#1a7a6d",
          tealSoft: "#d7efe9",
          coral: "#d96b4f",
          coralSoft: "#f8e4dc",
          sage: "#4f8a6a",
          sand: "#c4a574",
        },
      },
      boxShadow: {
        paper: "0 1px 0 rgba(36,48,56,0.04), 0 10px 28px rgba(36,48,56,0.06)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
