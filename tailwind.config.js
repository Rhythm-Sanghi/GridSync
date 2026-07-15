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
        // Backgrounds
        void:        '#0f0d08',
        panel:       '#161209',
        raised:      '#1e190f',
        inset:       '#0a0806',
        // Borders
        'border-dim':    '#221c10',
        'border-mid':    '#342a18',
        'border-warm':   '#524025',
        'border-bright': '#7a5c30',
        // Text
        ink:         '#e0d5b8',
        'ink-dim':   '#9a8a6a',
        'ink-mute':  '#5a4c35',
        'ink-inv':   '#0f0d08',
        // Accents
        brass:         '#a47828',
        'brass-light': '#c89a40',
        amber:         '#b87010',
        'amber-hot':   '#d88c18',
        copper:        '#a05828',
        rust:          '#883020',
        forest:        '#385a44',
        sage:          '#4e6a52',
      },
      fontFamily: {
        display: ['Cormorant', 'Georgia', 'serif'],
        mono:    ['IBM Plex Mono', 'ui-monospace', 'monospace'],
        sans:    ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        hw: '3px',
      },
      animation: {
        'led-pulse':      'ledPulse 2.5s ease-in-out infinite',
        'led-fast-pulse': 'ledFastPulse 0.7s ease-in-out infinite',
        'fade-in':        'fadeIn 0.3s ease-out',
        'slide-up':       'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'kick-pulse':     'kickPulse 0.08s ease-out',
        'spin':           'spin 1s linear infinite',
      },
      keyframes: {
        ledPulse:     { '0%,100%': { opacity: '0.75' }, '50%': { opacity: '1' } },
        ledFastPulse: { '0%,100%': { opacity: '0.5'  }, '50%': { opacity: '1' } },
        kickPulse:    { '0%': { transform: 'scale(1.0015)', filter: 'brightness(1.02)' }, '100%': { transform: 'scale(1)', filter: 'brightness(1)' } },
        fadeIn:       { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        spin:         { to: { transform: 'rotate(360deg)' } },
      },
      boxShadow: {
        'hw-btn':   '0 3px 0 #221c10, 0 4px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,210,140,0.07)',
        'hw-press': '0 1px 0 #221c10, 0 2px 5px rgba(0,0,0,0.4), inset 0 1px 4px rgba(0,0,0,0.35)',
        'hw-panel': '0 2px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,200,100,0.045)',
        'led-amber': '0 0 8px rgba(216,140,24,0.22), 0 0 3px rgba(184,112,16,0.4)',
      },
    },
  },
  plugins: [],
};
