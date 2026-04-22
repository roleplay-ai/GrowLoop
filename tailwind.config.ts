import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Nudgeable brand palette ──────────────────────────────────────────
      colors: {
        // Core brand
        brand: {
          yellow:   '#FFCE00',
          purple:   '#623CEA',
          green:    '#23CE68',
          orange:   '#F68A29',
          red:      '#ED4551',
          dark:     '#221D23',
          cream:    '#FFFDF5',
        },
        // Semantic aliases
        background: '#FFFDF5',
        foreground:  '#221D23',
        sidebar: {
          DEFAULT:  '#221D23',
          border:   'rgba(255,255,255,0.07)',
          muted:    'rgba(255,255,255,0.45)',
          active:   'rgba(255,206,0,0.07)',
        },
        card: {
          DEFAULT:  '#FFFFFF',
          border:   'rgba(34,29,35,0.07)',
        },
        muted: {
          DEFAULT:  'rgba(34,29,35,0.5)',
          foreground: '#8A8090',
        },
        accent: {
          DEFAULT:  '#623CEA',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT:  '#ED4551',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT:  '#23CE68',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT:  '#F68A29',
          foreground: '#FFFFFF',
        },
        // Radix-compatible shims
        border:   'rgba(34,29,35,0.09)',
        input:    'rgba(34,29,35,0.09)',
        ring:     '#623CEA',
        primary: {
          DEFAULT:  '#FFCE00',
          foreground: '#221D23',
        },
        secondary: {
          DEFAULT:  'rgba(34,29,35,0.06)',
          foreground: '#221D23',
        },
        popover: {
          DEFAULT:  '#FFFFFF',
          foreground: '#221D23',
        },
      },

      // ── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        xs:    ['0.75rem',  { lineHeight: '1rem' }],
        sm:    ['0.8125rem',{ lineHeight: '1.25rem' }],
        base:  ['0.9375rem',{ lineHeight: '1.5rem' }],
      },

      // ── Border radius ────────────────────────────────────────────────────
      borderRadius: {
        lg:  '14px',
        md:  '10px',
        sm:  '7px',
        xl:  '20px',
        '2xl': '24px',
      },

      // ── Shadows ──────────────────────────────────────────────────────────
      boxShadow: {
        card:  '0 1px 3px rgba(34,29,35,0.06), 0 4px 16px rgba(34,29,35,0.06)',
        modal: '0 8px 40px rgba(34,29,35,0.16)',
        glow:  '0 0 0 3px rgba(98,60,234,0.18)',
        'glow-yellow': '0 0 0 3px rgba(255,206,0,0.22)',
      },

      // ── Animations ───────────────────────────────────────────────────────
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%':   { transform: 'scale(0.4)', opacity: '0' },
          '65%':  { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'streak-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':       { transform: 'scale(1.15)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'typing': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%':            { transform: 'translateY(-5px)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,206,0,0.4)' },
          '50%':       { boxShadow: '0 0 0 10px rgba(255,206,0,0)' },
        },
      },
      animation: {
        'fade-up':      'fade-up 0.4s ease-out both',
        'fade-in':      'fade-in 0.25s ease-out both',
        'pop-in':       'pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        'streak-pulse': 'streak-pulse 2s infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'typing':       'typing 1.4s ease-in-out infinite',
        'glow-pulse':   'glow-pulse 2s infinite',
      },
    },
  },
  plugins: [animate],
}

export default config
