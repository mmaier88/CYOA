/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: '#14141f',
        'surface-hover': '#1e1e2d',
        primary: '#8b5cf6',
        'primary-hover': '#7c3aed',
        'text-main': '#e4e4e7',
        'text-muted': '#71717a',
        border: '#27272a',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        'ending-bad': '#ef4444',
        'ending-neutral': '#71717a',
        'ending-good': '#22c55e',
        'ending-best': '#8b5cf6',
        'ending-secret': '#f59e0b',
      },
      fontFamily: {
        narrative: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
