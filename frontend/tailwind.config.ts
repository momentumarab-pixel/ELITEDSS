module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg0: "#07090d",
        bg1: "#0b0f18",
        panel: "rgba(255,255,255,0.034)",
        brand: "#5b7fff",
        brand2: "#7c5fff",
        green: "#3ddc97",
        warn: "#ffcc66",
        red: "#ff5c6c",
        u23: "#b06fff",
        text: "#eaeef5",
        muted: "#8290a4",
      },
    },
  },
  plugins: [],
}