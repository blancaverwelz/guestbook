import type { Config } from "tailwindcss";

// darkMode: 'media' -> follows the guest's OS/browser prefers-color-scheme
// setting automatically. No manual toggle anywhere in this app.
const config: Config = {
  darkMode: "media",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        accent: "var(--accent)",
        "muted-foreground": "var(--muted-foreground)",
      },
    },
  },
  plugins: [],
};

export default config;
