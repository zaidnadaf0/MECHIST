import type { Config } from 'tailwindcss';

/**
 * MECHIST design tokens — "Signal" system.
 *
 * Includes the original MECHIST design system plus shadcn-compatible
 * semantic tokens required by UI components.
 */

/** RGB-channel variable helper for opacity modifiers such as bg-surface-2/60. */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const ink = {
  0: '#ffffff',
  50: '#f7f9fc',
  100: '#eff2f7',
  200: '#e1e6ef',
  300: '#c7cfdc',
  400: '#98a2b3',
  500: '#667085',
  600: '#4a5468',
  700: '#333c4e',
  800: '#1e2531',
  850: '#171c26',
  900: '#10141c',
  950: '#080b11',
};

const azure = {
  50: '#eef4ff',
  100: '#dce7ff',
  200: '#bbd0ff',
  300: '#8fb2ff',
  400: '#6094ff',
  500: '#3b7dff',
  600: '#2563eb',
  700: '#1b4bc4',
  800: '#163a94',
  900: '#122e70',
};

const aqua = {
  50: '#e6fbfa',
  100: '#c7f6f2',
  200: '#92ede7',
  300: '#55ddd6',
  400: '#22c7c2',
  500: '#0fb0ae',
  600: '#0a8e8e',
  700: '#0b7173',
  800: '#0c5a5c',
  900: '#0a4547',
};

const iris = {
  50: '#f1eeff',
  100: '#e4deff',
  200: '#cbbfff',
  300: '#ac98ff',
  400: '#8e73ff',
  500: '#7554f5',
  600: '#5f3fdb',
  700: '#4c31af',
  800: '#3a2687',
  900: '#2c1e66',
};

const gold = {
  50: '#fff8eb',
  100: '#fdedc9',
  200: '#fadb92',
  300: '#f7c555',
  400: '#f2ae2a',
  500: '#e39b12',
  600: '#bc7a0c',
  700: '#955f10',
  800: '#6e4712',
  900: '#452c0c',
};

/*
 * RoadAssisst brand accent — safety orange, used sparingly (primary CTAs,
 * key highlights). Text on ember-600/700+ is white and holds ≥4.5:1.
 * Role tones (azure/aqua/iris) and gold are unchanged: they encode
 * customer/mechanic/admin semantics across the portals.
 */
const ember = {
  50: '#fff4ed',
  100: '#ffe6d5',
  200: '#feccaa',
  300: '#fdac74',
  400: '#fb813c',
  500: '#f96116',
  600: '#ea4e0c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
};

const config: Config = {
  darkMode: 'class',

  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],

  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },

    extend: {
      colors: {
        /*
         * ================================================================
         * shadcn / UI semantic tokens
         * ================================================================
         *
         * These map directly to the OKLCH variables defined in
         * src/index.css.
         */
        background: 'var(--background)',
        foreground: 'var(--foreground)',

        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },

        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },

        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },

        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },

        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },

        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },

        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },

        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',

        /*
         * ================================================================
         * MECHIST Signal theme
         * ================================================================
         */

        surface: {
          app: v('--s-app'),
          1: v('--s-1'),
          2: v('--s-2'),
          3: v('--s-3'),
          inset: v('--s-inset'),
        },

        fg: {
          app: v('--f-app'),
          muted: v('--f-muted'),
          subtle: v('--f-subtle'),
          inverse: v('--f-inverse'),
        },

        line: {
          DEFAULT: 'rgb(var(--l-rgb) / 0.10)',
          soft: 'rgb(var(--l-rgb) / 0.10)',
          strong: 'rgb(var(--l-rgb) / 0.22)',
        },

        hair: v('--l-rgb'),

        ink,
        azure,
        aqua,
        iris,
        gold,
        ember,

        brand: azure,
        info: azure,

        success: {
          50: '#e8f8f0',
          100: '#c9eedc',
          200: '#9ce0c2',
          300: '#6fd3a4',
          400: '#35bd86',
          500: '#16a971',
          600: '#0f8a5c',
          700: '#0b6e4a',
          800: '#0a5339',
          900: '#083f2c',
        },

        warning: {
          50: '#fff6ed',
          100: '#ffe8d0',
          200: '#fecfa4',
          300: '#fdb06b',
          400: '#fb8f37',
          500: '#f79009',
          600: '#dc6803',
          700: '#b54708',
          800: '#93370d',
          900: '#7a2e0e',
        },

        danger: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#fecdca',
          300: '#fda29b',
          400: '#f97066',
          500: '#f04438',
          600: '#d92d20',
          700: '#b42318',
          800: '#912018',
          900: '#7a271a',
        },
      },

      fontFamily: {
        display: [
          'Manrope',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },

      fontSize: {
        'display-2xl': [
          'clamp(3.25rem, 8.5vw, 8rem)',
          {
            lineHeight: '0.94',
            letterSpacing: '-0.045em',
            fontWeight: '700',
          },
        ],

        'display-xl': [
          'clamp(2.75rem, 7vw, 5.75rem)',
          {
            lineHeight: '0.98',
            letterSpacing: '-0.04em',
            fontWeight: '700',
          },
        ],

        'display-lg': [
          'clamp(2.25rem, 5.5vw, 4.25rem)',
          {
            lineHeight: '1.03',
            letterSpacing: '-0.035em',
            fontWeight: '700',
          },
        ],

        'display-md': [
          'clamp(1.75rem, 4vw, 3rem)',
          {
            lineHeight: '1.08',
            letterSpacing: '-0.03em',
            fontWeight: '650',
          },
        ],

        'display-sm': [
          'clamp(1.375rem, 3vw, 2.25rem)',
          {
            lineHeight: '1.14',
            letterSpacing: '-0.022em',
            fontWeight: '600',
          },
        ],

        h1: [
          'clamp(1.5rem, 2.6vw, 2rem)',
          {
            lineHeight: '1.2',
            letterSpacing: '-0.018em',
            fontWeight: '650',
          },
        ],

        h2: [
          'clamp(1.25rem, 2.2vw, 1.625rem)',
          {
            lineHeight: '1.25',
            letterSpacing: '-0.014em',
            fontWeight: '650',
          },
        ],

        h3: [
          'clamp(1.0625rem, 1.8vw, 1.25rem)',
          {
            lineHeight: '1.32',
            letterSpacing: '-0.01em',
            fontWeight: '600',
          },
        ],

        body: ['1rem', { lineHeight: '1.6' }],

        'body-lg': ['1.0625rem', { lineHeight: '1.65' }],

        small: ['0.875rem', { lineHeight: '1.5' }],

        xs: ['0.75rem', { lineHeight: '1.45' }],

        label: [
          '0.6875rem',
          {
            lineHeight: '1.2',
            letterSpacing: '0.14em',
            fontWeight: '600',
          },
        ],
      },

      spacing: {
        13: '3.25rem',
        section: 'clamp(4.5rem, 10vw, 9rem)',
        'section-sm': 'clamp(2.5rem, 6vw, 5rem)',
        gutter: 'clamp(1.25rem, 3vw, 2.5rem)',
      },

      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        section: 'clamp(1.25rem, 2.5vw, 2rem)',
      },

      boxShadow: {
        card: 'var(--sh-card)',
        cardHover: 'var(--sh-card-hover)',
        pop: 'var(--sh-pop)',
        inset: 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',

        'glow-azure':
          '0 0 0 1px rgb(59 125 255 / 0.35), 0 18px 45px -18px rgb(59 125 255 / 0.55)',

        'glow-aqua':
          '0 0 0 1px rgb(15 176 174 / 0.35), 0 18px 45px -18px rgb(15 176 174 / 0.5)',

        'glow-iris':
          '0 0 0 1px rgb(117 84 245 / 0.35), 0 18px 45px -18px rgb(117 84 245 / 0.5)',

        'glow-gold':
          '0 0 0 1px rgb(242 174 42 / 0.35), 0 18px 45px -18px rgb(242 174 42 / 0.45)',
      },

      backgroundImage: {
        'grid-fine':
          'linear-gradient(to right, rgb(var(--l-rgb) / 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--l-rgb) / 0.10) 1px, transparent 1px)',

        'mesh-signal':
          'radial-gradient(60% 50% at 12% 0%, rgb(59 125 255 / 0.20), transparent 60%), radial-gradient(45% 45% at 92% 8%, rgb(117 84 245 / 0.16), transparent 62%), radial-gradient(55% 50% at 70% 100%, rgb(15 176 174 / 0.14), transparent 60%)',

        sheen:
          'linear-gradient(100deg, transparent 20%, rgb(255 255 255 / 0.14) 48%, transparent 74%)',
      },

      backgroundSize: {
        'grid-fine': '56px 56px',
      },

      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'out-back': 'cubic-bezier(0.34, 1.42, 0.64, 1)',
      },

      keyframes: {
        'fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(14px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },

        shimmer: {
          '0%': {
            backgroundPosition: '-420px 0',
          },
          '100%': {
            backgroundPosition: '420px 0',
          },
        },

        pulseDot: {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.35',
            transform: 'scale(0.86)',
          },
        },

        ping2: {
          '0%': {
            transform: 'scale(0.6)',
            opacity: '0.7',
          },
          '100%': {
            transform: 'scale(2.4)',
            opacity: '0',
          },
        },

        sweep: {
          '0%': {
            transform: 'translateX(-120%)',
          },
          '100%': {
            transform: 'translateX(120%)',
          },
        },

        float: {
          '0%, 100%': {
            transform: 'translateY(-4px)',
          },
          '50%': {
            transform: 'translateY(4px)',
          },
        },

        'spin-slow': {
          to: {
            transform: 'rotate(360deg)',
          },
        },

        'bar-grow': {
          from: {
            transform: 'scaleY(0.15)',
          },
          to: {
            transform: 'scaleY(1)',
          },
        },
      },

      animation: {
        'fade-up':
          'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',

        shimmer: 'shimmer 1.5s linear infinite',

        'pulse-dot':
          'pulseDot 1.5s ease-in-out infinite',

        ping2:
          'ping2 2.2s cubic-bezier(0,0,0.2,1) infinite',

        sweep:
          'sweep 2.6s ease-in-out infinite',

        float:
          'float 6s ease-in-out infinite',

        'spin-slow':
          'spin-slow 14s linear infinite',

        'bar-grow':
          'bar-grow 0.9s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },

  plugins: [],
};

export default config;