import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#F3E9E1",
        paper: "#FAF7F4",
        terracotta: "#C97E4E",
        olive: "#BBAA77",
        ink: "#3B2F2F",
      },
      borderRadius: { xl: "0.75rem" },
    },
  },
  plugins: [],
} satisfies Config;
