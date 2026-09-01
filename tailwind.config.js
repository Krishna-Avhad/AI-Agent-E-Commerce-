/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0F172A",
          dark: "#020617",
          light: "#1E293B",
          container: "#131B2E",
          onContainer: "#7C839B",
        },
        ai: {
          DEFAULT: "#0D9488",
          light: "#14B8A6",
          dark: "#0F766E",
          surface: "#F0FDFA",
          glow: "rgba(13, 148, 136, 0.25)",
        },
        accent: {
          purple: "#6366F1",
          indigo: "#4F46E5",
          teal: "#0D9488",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
        },
        surface: {
          DEFAULT: "#F7F9FB",
          card: "#FFFFFF",
          dim: "#D8DADC",
          container: "#ECEEF0",
          high: "#E6E8EA",
          highest: "#E0E3E5",
          border: "#E2E8F0",
        },
      },
      fontFamily: {
        heading: ["DM Sans", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)",
        card: "0 4px 20px -2px rgba(15, 23, 42, 0.05)",
        glow: "0 0 20px -2px rgba(13, 148, 136, 0.2)",
        "glow-lg": "0 0 30px -4px rgba(13, 148, 136, 0.35)",
        modal: "0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
      },
      borderRadius: {
        card: "0.75rem",
        button: "0.5rem",
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-in-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
