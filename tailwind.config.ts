import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Hagi-Shop Design: Dark Luxury — Tiefes Dunkelbraun + Antikgold + Creme
      colors: {
        bg:           "#0B0905",
        "bg-card":    "#141009",
        "bg-elevated":"#1D1610",
        surface:      "#141009",
        border:       "#28211A",
        "border-light":"#352C22",
        ink:          "#F0E6D0",
        cream:        "#F0E6D0",
        "cream-muted":"#C8B89A",
        muted:        "#8A7A65",
        gold:         "#C9A553",
        "gold-light": "#E4C87E",
        green:        "#2D4A3E",
        signal:       "#C4172B",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans:  ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:  ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
