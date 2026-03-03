/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg0: "#03050a",
        bg1: "#0a0e17", 
        panel: "rgba(18,25,40,0.6)",
        panelHover: "rgba(30,40,60,0.8)",
        brand: "#3b82f6",
        brandLight: "#60a5fa",
        brandDark: "#2563eb",
        green: "#10b981",
        amber: "#f59e0b",
        red: "#ef4444",
        purple: "#8b5cf6",
        text: "#f8fafc",
        textMuted: "#94a3b8",
        blue: {
          300: "#93c5fd",
          500: "#3b82f6",
        },
        purple: {
          300: "#c4b5fd",
          500: "#8b5cf6",
        },
        amber: {
          300: "#fcd34d",
          500: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
}
