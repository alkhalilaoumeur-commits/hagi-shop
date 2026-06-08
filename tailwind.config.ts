import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Hagi-Shop Design: Warm Luxury — Creme + Antikgold + Dunkelgrün
      colors: {
        bg:      "#FAF7F2", // Haupthintergrund — warmes Elfenbein
        surface: "#F3EFE8", // Card-Hintergrund
        border:  "#E2D9CC", // Rahmen
        ink:     "#1A1614", // Haupttext
        muted:   "#7A6E65", // Sekundärtext
        gold:    "#8B6914", // Antikgold — Preise, Akzente
        green:   "#2D4A3E", // Dunkelgrün — CTAs, Headers
        signal:  "#C4172B", // Rot — Sale, Ausverkauft
      },
      fontFamily: {
        // Serif für Headlines (arabisch-inspirierter Luxus-Look)
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans:  ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono:  ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
