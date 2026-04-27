import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'navy-deep':  '#060C18',
        'navy-mid':   '#0D1E3D',
        'navy-light': '#1B3C6B',
        'brand-blue': '#4A73C4',
        'brand-cyan': '#00B4C8',
        'off-white':  '#F4F6FB',
        'text-dark':  '#1A1A2E',
        'text-body':  '#3A4556',
        'text-muted': '#7B8494',
        'tier-idea':   '#CC1F2A',
        'tier-seed':   '#C8890A',
        'tier-series': '#4A73C4',
        'tier-top':    '#0E7C4F',
      },
      fontFamily: {
        heading: ['var(--font-onest)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-inter)',  'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(140deg, #060C18 0%, #0D1E3D 50%, #1B3C6B 100%)',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.94)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'fade-up':  'fadeUp 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'shimmer':  'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
