/** @type {import('tailwindcss').Config} */

// Every screen uses these colour names, so the ledger look is set here once.
// Blue and slate become ink, red becomes the red pen, and white becomes the
// ruled page.
const ink = {
  50: '#E4EAF5', 100: '#D6DFF0', 200: '#BCCCE0', 300: '#55628C', 400: '#4F5C87',
  500: '#14256B', 600: '#14256B', 700: '#1F2F70', 800: '#0F1C55', 900: '#0F1C55',
}
const turmeric = {
  50: '#FBF3D6', 100: '#F8E9B4', 200: '#F4C95D', 300: '#E6B23E', 400: '#C9951F',
  500: '#A97B10', 600: '#8A6408', 700: '#6F4E00', 800: '#5A3F00', 900: '#463100',
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    borderRadius: {
      none: '0', DEFAULT: '0', sm: '0', md: '0', lg: '0', xl: '0', '2xl': '0', '3xl': '0',
      full: '9999px',
    },
    boxShadow: {
      none: 'none', sm: 'none', DEFAULT: 'none', md: 'none',
      lg: '0 8px 20px rgba(20, 37, 107, 0.18)',
      xl: '0 8px 20px rgba(20, 37, 107, 0.18)',
      '2xl': '0 12px 32px rgba(20, 37, 107, 0.24)',
    },
    extend: {
      colors: {
        cloth: '#9E1B32',
        thread: '#F4C95D',
        paper: '#F2F6EC',
        rule: '#BCCCE0',
        pen: '#C8102E',
        ink: '#14256B',
        white: '#F2F6EC',
        primary: ink,
        blue: ink,
        purple: ink,
        slate: {
          50: '#E8EEE0', 100: '#DCE5DA', 200: '#BCCCE0', 300: '#55628C', 400: '#4F5C87',
          500: '#414E7E', 600: '#333F72', 700: '#1F2F70', 800: '#14256B', 900: '#0F1C55',
        },
        red: {
          50: '#FBEBEC', 100: '#F7D9DD', 200: '#E79AA6', 300: '#DC7386', 400: '#D4364D',
          500: '#C8102E', 600: '#B00D27', 700: '#9E0B22', 800: '#7F0A1C', 900: '#6B0817',
        },
        emerald: {
          50: '#E6F1E6', 100: '#D3E7D6', 200: '#A9CFB2', 300: '#7FB48D', 400: '#4C8F63',
          500: '#267A4F', 600: '#1B6B45', 700: '#145536', 800: '#0F432A', 900: '#0B3320',
        },
        amber: turmeric,
        yellow: turmeric,
        orange: turmeric,
      },
      fontFamily: {
        sans: ['"Anek Latin"', 'Arial', 'sans-serif'],
        mono: ['"Anek Latin"', 'Arial', 'sans-serif'],
        deva: ['"Anek Devanagari"', '"Anek Latin"', 'sans-serif'],
      },
      fontSize: {
        xs: ['13px', '18px'],
        sm: ['14.5px', '20px'],
      },
    },
  },
  plugins: [],
}
