import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#1C1B18",
        gold: "#C9A227",
        beige: "#F5EFE0",
      },
    },
  },
  plugins: [],
};

export default config;
