import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "sans-serif",
        ],
      },
      colors: {
        // Toss Gray Scale
        gray: {
          50: "#F9FAFB",
          100: "#F2F4F6",
          200: "#E5E8EB",
          300: "#D1D6DB",
          400: "#B0B8C1",
          500: "#8B95A1",
          600: "#6B7684",
          700: "#4E5968",
          800: "#333D4B",
          900: "#191F28",
        },
        // Toss Key Blue
        blue: {
          50: "#E8F3FF",
          500: "#3182F6",
          600: "#2272EB",
        },
        // Grade (TDS 색감 기반)
        grade: {
          s: { bg: "#FFF8F0", text: "#E8590C" },
          a: { bg: "#E8F3FF", text: "#3182F6" },
          b: { bg: "#F2F4F6", text: "#6B7684" },
        },
        // Status
        status: {
          available: "#1D9E75",
          negotiable: "#8B95A1",
          employed: "#D1D6DB",
        },
      },
      borderWidth: {
        "0.5": "0.5px",
      },
    },
  },
  plugins: [],
};
export default config;
