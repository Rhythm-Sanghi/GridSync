/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00f5ff',
          magenta: '#ff00a8',
          lime: '#a8ff00',
          orange: '#ff8c00',
          violet: '#b400ff',
          yellow: '#ffe600',
          red: '#ff3355',
        },
        dark: {
          950: '#050508',
          900: '#0a0a14',
          800: '#10101e',
          700: '#16162a',
          600: '#1e1e36',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 8px #00f5ff, 0 0 20px #00f5ff44',
        'neon-magenta': '0 0 8px #ff00a8, 0 0 20px #ff00a844',
        'neon-lime': '0 0 8px #a8ff00, 0 0 20px #a8ff0044',
        'neon-orange': '0 0 8px #ff8c00, 0 0 20px #ff8c0044',
        'neon-violet': '0 0 8px #b400ff, 0 0 20px #b400ff44',
        'neon-red': '0 0 8px #ff3355, 0 0 20px #ff335544',
        'neon-white': '0 0 8px #ffffff, 0 0 20px #ffffff44',
      },
      animation: {
        'pulse-glow': 'pulseGlow 0.6s ease-out',
        'step-flash': 'stepFlash 0.12s ease-out',
        'screen-pulse': 'screenPulse 0.08s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        pulseGlow: {
          '0%': { opacity: '0.6', transform: 'scale(0.97)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        stepFlash: {
          '0%': { filter: 'brightness(2.5) saturate(1.5)' },
          '100%': { filter: 'brightness(1) saturate(1)' },
        },
        screenPulse: {
          '0%': { transform: 'scale(1.004)' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
