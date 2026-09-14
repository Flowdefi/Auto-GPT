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
        // TF Recovery — the consumer-facing brand. Deliberately separate from
        // the internal Cove palette so the portal reads as a payment site.
        tfr: {
          navy: "#12293a",
          ink: "#0d1b25",
          blue: "#1f6f8b",
          blueSoft: "#e4f0f4",
          mist: "#f5f8fa",
          line: "#d9e4ea",
          green: "#2f7d59",
          greenSoft: "#e3f2ea",
          amber: "#9a6b16",
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
