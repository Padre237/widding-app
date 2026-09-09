/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette principale — Orange Brûlé Luxe
        primary: '#914800',
        'primary-dark': '#713700',
        'primary-container': '#b65c00',
        'primary-fixed': '#ffdcc6',
        'primary-fixed-dim': '#ffb785',
        'on-primary': '#ffffff',
        'on-primary-fixed': '#301400',

        // Surfaces & Backgrounds
        surface: '#fff8f1',
        'surface-dim': '#dfd9d1',
        'surface-bright': '#fff8f1',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f9f3eb',
        'surface-container': '#f4ede5',
        'surface-container-high': '#eee7df',
        'surface-container-highest': '#e8e1da',
        'surface-variant': '#e8e1da',
        background: '#fff8f1',

        // Typographie & Contenu
        'on-surface': '#1e1b17',
        'on-surface-variant': '#564336',
        'inverse-surface': '#33302b',
        'inverse-on-surface': '#f7f0e8',
        'inverse-primary': '#ffb785',

        // Secondaires
        secondary: '#5f5e5c',
        'on-secondary': '#ffffff',
        'secondary-container': '#e2dfdc',
        'on-secondary-container': '#636260',
        'secondary-fixed': '#e5e2df',
        'secondary-fixed-dim': '#c8c6c3',
        'on-secondary-fixed': '#1b1c1a',
        'on-secondary-fixed-variant': '#474744',

        // Tertiaires
        tertiary: '#5d5c58',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#767470',
        'on-tertiary-container': '#fdffde',
        'tertiary-fixed': '#e5e2dd',
        'tertiary-fixed-dim': '#c9c6c1',
        'on-tertiary-fixed': '#1c1c19',
        'on-tertiary-fixed-variant': '#474743',

        // Erreurs
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        // Contours
        outline: '#897364',
        'outline-variant': '#ddc1b1',
        'surface-tint': '#954a00',

        // Succès (non-Material — ajout custom)
        success: '#1e5e3a',
        'success-container': '#d1fae5',
        'on-success': '#ffffff',
      },

      fontFamily: {
        // Typographies
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-lg-mobile': ['30px', { lineHeight: '38px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-lg': ['26px', { lineHeight: '34px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'headline-md': ['22px', { lineHeight: '28px', fontWeight: '500' }],
        'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'label-lg': ['13px', { lineHeight: '18px', letterSpacing: '0.08em', fontWeight: '600' }],
        'label-md': ['11px', { lineHeight: '16px', letterSpacing: '0.06em', fontWeight: '600' }],
        'label-sm': ['10px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '500' }],
      },

      borderRadius: {
        DEFAULT: '0.125rem',
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },

      spacing: {
        'space-2xs': '0.25rem',
        'space-xs': '0.5rem',
        'space-sm': '0.75rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        'space-2xl': '2.5rem',
        'space-3xl': '3.5rem',
        'screen-gutter': '1.25rem',
        'touch-target-min': '3rem',
      },

      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.07)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
        xl: '0 20px 25px rgba(0,0,0,0.1)',
        luxury: '0 12px 32px rgba(44, 44, 42, 0.06)',
        inner: 'inset 0 1px 2px rgba(0,0,0,0.05)',
      },

      animation: {
        'scan-line': 'scanLine 1.5s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        waveform: 'waveform 1.2s ease-in-out infinite alternate',
      },

      keyframes: {
        scanLine: {
          '0%': { transform: 'translateY(-4rem)' },
          '100%': { transform: 'translateY(4rem)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        waveform: {
          '0%': { height: '4px' },
          '100%': { height: '100%' },
        },
      },
    },
  },
  plugins: [],
};
