import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:            "#FAFAF7",
        "bg-card":     "#FFFFFF",
        "bg-elevated": "#F0EAD8",
        "bg-sand":     "#F0EAD8",
        ink:           "#0F0A06",
        "ink-muted":   "#5A4A3A",
        muted:         "#8A7866",
        border:        "#E5DCC8",
        "border-light":"#EFE7D6",
        bone:          "#FAFAF7",
        brass:         "#B89968",
        "brass-light": "#D2B889",
        sienna:        "#A33B2A",
        "sienna-dark": "#7E2A1D",
        beige:         "#B89968",
        red:           "#A33B2A",
        "red-light":   "#C24A37",
        cream:         "#0F0A06",
        "cream-muted": "#5A4A3A",
        gold:          "#B89968",
        "gold-light":  "#D2B889",
        signal:        "#A33B2A",
        green:         "#2D4A3E",
        "hero-bg":     "#0F0A06",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
        sans:  ["'DM Sans'", "system-ui", "sans-serif"],
      },
      maxWidth: {
        page: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
