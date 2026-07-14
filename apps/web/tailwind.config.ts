import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#000000",
        orange: "#F2650C",
        beige: "#F5EFE0",
      },
    },
  },
  plugins: [],
};

export default config;
