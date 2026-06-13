/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/client/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        sport: {
          green: '#16a34a',
          blue: '#2563eb',
          gold: '#d97706',
          field: '#15803d',
        },
      },
      animation: {
        'success-flash': 'success-flash 0.6s ease-out',
        'points-awarded': 'points-awarded 0.5s ease-out',
        'live-pulse': 'live-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
