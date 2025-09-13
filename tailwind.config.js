/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,mdx}",
    "./pages/**/*.{js,jsx,ts,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx,mdx}",
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        gothic: ["var(--font-unifraktur)"],
        serif: ["var(--font-cormorant)", "ui-serif", "Georgia"],
      },
      colors: {
        accent: {
          DEFAULT: "#8b5cf6", // 紫
          500: "#8b5cf6",
          600: "#7c3aed",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(139,92,246,0.25)",
      },
      backgroundImage: {
        "radial-veil":
          "radial-gradient(1000px 500px at 50% -10%, rgba(139,92,246,0.15), transparent 60%)",
      },
    },
  },
  plugins: [],
};
