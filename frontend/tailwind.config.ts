import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        muted: "#667085",
        panel: "#f8fafc",
        brand: "#2E7D32", // Primary Green (Health, growth, safety)
        brandTeal: "#009688", // Teal (Healing, calmness, balance)
        brandBlue: "#1976D2", // Primary Blue (Trust, reliability)
        brandDeepBlue: "#0D47A1", // Deep Blue (Stability, confidence)
        brandLightGreen: "#8BC34A", // Light Green (Positive, fresh)
        brandMint: "#E8F5E9", // Mint Green (Soft background)
        brandLightBlue: "#E3F2FD", // Light Blue (Clean background)
        danger: "#dc2626",
        warn: "#d97706"
      }
    },
  },
  plugins: [],
};
export default config;
