/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'obsidian': '#F4F6F8',
        'sidebar': '#0B1F3A',
        'card': '#FFFFFF',
        'surface': '#EEF1F5',
        'accent-cyan': '#3A6EA5',
        'accent-red': '#C62828',
        'accent-amber': '#F9A825',
        'text-dim': '#718096',
        'subtle': 'rgba(11, 31, 58, 0.04)',
        'gov-navy': '#0B1F3A',
        'gov-navy-hover': '#142847',
        'gov-accent': '#3A6EA5',
        'gov-saffron': '#F9A825',
        'gov-green': '#2E7D32',
        'border-gov': '#D1D9E0',
      },
      fontFamily: {
        sans: ['Inter', 'Source Sans Pro', 'Roboto', 'sans-serif'],
      },
      animation: {
        'scan': 'scan-line 3s linear infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'fadeIn': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      boxShadow: {
        'gov': '0 1px 4px rgba(11,31,58,0.08), 0 1px 2px rgba(11,31,58,0.04)',
        'gov-md': '0 4px 12px rgba(11,31,58,0.1), 0 2px 4px rgba(11,31,58,0.06)',
      }
    },
  },
  plugins: [],
}
