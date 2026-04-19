/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#05060B',
          1: '#0A0B13',
          2: '#11121C',
          3: '#181A26',
        },
        line: {
          DEFAULT: 'rgba(148,163,184,0.12)',
          strong: 'rgba(148,163,184,0.22)',
        },
        fg: {
          0: '#E6E8F0',
          1: '#B8BDCB',
          2: '#7C8293',
          3: '#4A5063',
        },
        brand: {
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
        },
        success: {
          400: '#34D399',
          500: '#10B981',
        },
        warn: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        danger: {
          400: '#FB7185',
          500: '#F43F5E',
        },
      },
      borderRadius: {
        control: '10px',
        card: '14px',
        pill: '9999px',
      },
      boxShadow: {
        e1: '0 1px 2px rgba(0,0,0,.4)',
        e2: '0 4px 12px rgba(0,0,0,.45)',
        glow: '0 0 16px rgba(99,102,241,.25)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
