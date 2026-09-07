/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        yuli: {
          ego: {
            primary: '#F59E0B',
            secondary: '#D97706',
            glow: 'rgba(245, 158, 11, 0.25)',
            subtle: 'rgba(245, 158, 11, 0.08)',
          },
          shadow: {
            primary: '#D97706',
            secondary: '#B45309',
            rose: '#E879F9',
            glow: 'rgba(232, 121, 249, 0.25)',
            subtle: 'rgba(232, 121, 249, 0.08)',
          },
          subconscious: {
            primary: '#6366F1',
            secondary: '#8B5CF6',
            glow: 'rgba(99, 102, 241, 0.25)',
            subtle: 'rgba(99, 102, 241, 0.08)',
          },
          superego: {
            primary: '#06B6D4',
            secondary: '#64748B',
            glow: 'rgba(6, 182, 212, 0.22)',
            subtle: 'rgba(6, 182, 212, 0.08)',
          }
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'subtle-drift': 'drift 12s ease-in-out infinite alternate',
      },
      keyframes: {
        drift: {
          '0%': { transform: 'scale(1) translate(0px, 0px)' },
          '100%': { transform: 'scale(1.08) translate(15px, -15px)' },
        }
      }
    },
  },
  plugins: [],
}
