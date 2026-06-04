/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        atreyus: {
          bg: '#131214',
          surface: '#1f1f1f',
          elevated: '#2b2b2b',
          border: '#2b2b2b',
          purple: '#6e3bff',
          'purple-bright': '#863bff',
          blue: '#4d65ff',
          accent: '#c6fb50',
          muted: '#70737e',
          'muted-light': '#9b9b9b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        atreyus: '1rem',
        pill: '100vw',
      },
      boxShadow: {
        'glow-purple': '0 0 40px rgba(110, 59, 255, 0.2)',
        'glow-purple-lg': '0 0 80px rgba(110, 59, 255, 0.15)',
        'glow-white': '0 0 20px 3px rgba(255, 255, 255, 0.6)',
      },
      backgroundImage: {
        'atreyus-gradient':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(110, 59, 255, 0.18), transparent)',
      },
    },
  },
  plugins: [],
}
