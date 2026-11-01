/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0f1d',
        surface: '#111827',
        'surface-card': '#1f293d',
        'surface-border': '#2d3748',
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        emergency: {
          red: '#ef4444',
          orange: '#f97316',
          amber: '#f59e0b',
          green: '#10b981',
          cyan: '#06b6d4',
          purple: '#8b5cf6'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-ping': 'radarPing 2s infinite ease-out',
        'beacon': 'beaconPulse 1.5s infinite',
      },
      keyframes: {
        radarPing: {
          '0%': { transform: 'scale(0.8)', opacity: '0.9' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        beaconPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.05)' },
        }
      }
    },
  },
  plugins: [],
}
