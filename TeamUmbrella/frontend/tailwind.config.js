/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#000000',
          secondary: '#050505',
          panel: '#0A0A0A',
          card: '#0D0D0D',
          cardAlt: '#111111',
        },
        border: {
          primary: '#1A1A1A',
          secondary: '#262626',
          accent: '#1e3a5f',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#9CA3AF',
          muted: '#6B7280',
        },
        accent: {
          primary: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
          glow: 'rgba(59, 130, 246, 0.5)',
        },
        risk: {
          safe: '#064E3B',
          safeText: '#34D399',
          warning: '#78350F',
          warningText: '#FBBF24',
          danger: '#7F1D1D',
          dangerText: '#F87171',
        },
        alert: {
          red: '#EF4444',
          amber: '#F59E0B',
          green: '#10B981',
        },
        intel: {
          blue: '#1E3A5F',
          cyan: '#0E7490',
          purple: '#5B21B6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.3), 0 0 10px rgba(59, 130, 246, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(59, 130, 246, 0.5), 0 0 25px rgba(59, 130, 246, 0.3)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'glow': '0 0 10px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 20px rgba(59, 130, 246, 0.4)',
        'danger': '0 0 10px rgba(239, 68, 68, 0.3)',
        'warning': '0 0 10px rgba(245, 158, 11, 0.3)',
        'safe': '0 0 10px rgba(16, 185, 129, 0.3)',
      },
    },
  },
  plugins: [],
}
