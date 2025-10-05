import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,0.12)",
        cardDark: "0 4px 16px rgba(0,0,0,0.22)",
      },
    },
  },
  plugins: [],
} satisfies Config;
