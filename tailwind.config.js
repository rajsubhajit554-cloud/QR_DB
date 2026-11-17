/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FAF8F5',
          100: '#F4EFEA',
          200: '#E8DFD5',
        },
        ink: {
          900: '#14141E',
          800: '#232332',
          700: '#38384D',
          500: '#6C6C82',
          300: '#A4A4B8',
        },
        indigoBrand: {
          900: '#15152F',
          800: '#1F2044',
          700: '#2C2D5B',
        },
        signal: {
          DEFAULT: '#00C2A8',
          hover: '#00A892',
          light: '#E6FAF6',
        },
        coral: {
          DEFAULT: '#FF6B4A',
          hover: '#E85535',
          light: '#FFF0EC',
        }
      },
      fontFamily: {
        sans: ['"Hind Siliguri"', 'sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
};
