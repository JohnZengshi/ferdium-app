/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan all TSX/TS files in src/ for Tailwind class usage
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  corePlugins: {
    // Disable Preflight (Tailwind's CSS reset) to avoid conflicts with existing SCSS globals
    preflight: false,
  },
  theme: {
    extend: {
      // ── Semantic color aliases mapped to TDesign CSS variables ──────────
      // These automatically respond to dark mode because TDesign swaps its
      // CSS variable values when [theme-mode="dark"] is set on <html>.
      //
      // Usage:
      //   bg-page, bg-container, bg-component
      //   text-primary, text-secondary, text-placeholder
      //   border-line, border-line-2
      //   bg-brand, text-error, bg-success-light, etc.
      colors: {
        // ── Brand / accent ──
        brand: 'var(--td-brand-color)',
        'brand-hover': 'var(--td-brand-color-hover)',
        'brand-focus': 'var(--td-brand-color-focus)',
        'brand-active': 'var(--td-brand-color-active)',
        'brand-disabled': 'var(--td-brand-color-disabled)',
        'brand-light': 'var(--td-brand-color-light)',
        'brand-light-hover': 'var(--td-brand-color-light-hover)',

        // ── Semantic status ──
        success: 'var(--td-success-color)',
        'success-hover': 'var(--td-success-color-hover)',
        'success-focus': 'var(--td-success-color-focus)',
        'success-active': 'var(--td-success-color-active)',
        'success-disabled': 'var(--td-success-color-disabled)',
        'success-light': 'var(--td-success-color-light)',
        warning: 'var(--td-warning-color)',
        'warning-hover': 'var(--td-warning-color-hover)',
        'warning-light': 'var(--td-warning-color-light)',
        error: 'var(--td-error-color)',
        'error-hover': 'var(--td-error-color-hover)',
        'error-focus': 'var(--td-error-color-focus)',
        'error-light': 'var(--td-error-color-light)',

        // ── Background surfaces ──
        page: 'var(--td-bg-color-page)',
        container: 'var(--td-bg-color-container)',
        'container-hover': 'var(--td-bg-color-container-hover)',
        'container-active': 'var(--td-bg-color-container-active)',
        'container-select': 'var(--td-bg-color-container-select)',
        'secondary-container': 'var(--td-bg-color-secondarycontainer)',
        'secondary-container-hover':
          'var(--td-bg-color-secondarycontainer-hover)',
        component: 'var(--td-bg-color-component)',
        'component-hover': 'var(--td-bg-color-component-hover)',
        'component-active': 'var(--td-bg-color-component-active)',
        'component-disabled': 'var(--td-bg-color-component-disabled)',
        'secondary-component': 'var(--td-bg-color-secondarycomponent)',
        'special-component': 'var(--td-bg-color-specialcomponent)',
        'kb-surface': 'var(--td-bg-color-kb-surface)',

        // ── Text ──
        primary: 'var(--td-text-color-primary)',
        secondary: 'var(--td-text-color-secondary)',
        placeholder: 'var(--td-text-color-placeholder)',
        disabled: 'var(--td-text-color-disabled)',
        'text-anti': 'var(--td-text-color-anti)',
        'text-brand': 'var(--td-text-color-brand)',
        'text-link': 'var(--td-text-color-link)',
        'text-watermark': 'var(--td-text-color-watermark)',

        // ── Borders / strokes ──
        line: 'var(--td-border-level-1-color)',
        'line-2': 'var(--td-border-level-2-color)',
        stroke: 'var(--td-component-stroke)',
        'component-border': 'var(--td-component-border)',

        // ── Gray scale (replaces default Tailwind gray) ──
        'gray-1': 'var(--td-gray-color-1)',
        'gray-2': 'var(--td-gray-color-2)',
        'gray-3': 'var(--td-gray-color-3)',
        'gray-4': 'var(--td-gray-color-4)',
        'gray-5': 'var(--td-gray-color-5)',
        'gray-6': 'var(--td-gray-color-6)',
        'gray-7': 'var(--td-gray-color-7)',
        'gray-8': 'var(--td-gray-color-8)',
        'gray-9': 'var(--td-gray-color-9)',
        'gray-10': 'var(--td-gray-color-10)',
        'gray-11': 'var(--td-gray-color-11)',
        'gray-12': 'var(--td-gray-color-12)',
        'gray-13': 'var(--td-gray-color-13)',
        'gray-14': 'var(--td-gray-color-14)',
      },

      // ── Border radius mapped to TDesign tokens ──
      boxShadow: {
        'kb-card': 'var(--td-bg-color-kb-card-shadow)',
      },
      borderRadius: {
        'td-sm': 'var(--td-radius-small)',
        'td-default': 'var(--td-radius-default)',
        'td-md': 'var(--td-radius-medium)',
        'td-lg': 'var(--td-radius-large)',
        'td-xl': 'var(--td-radius-extraLarge)',
        'td-round': 'var(--td-radius-round)',
        'td-circle': 'var(--td-radius-circle)',
      },

      // ── Spacing mapped to TDesign size scale ──
      // Shorthand for common TDesign spacing tokens (td-1 = 2px … td-16 = 72px)
      spacing: {
        'td-1': 'var(--td-size-1)',
        'td-2': 'var(--td-size-2)',
        'td-3': 'var(--td-size-3)',
        'td-4': 'var(--td-size-4)',
        'td-5': 'var(--td-size-5)',
        'td-6': 'var(--td-size-6)',
        'td-7': 'var(--td-size-7)',
        'td-8': 'var(--td-size-8)',
        'td-9': 'var(--td-size-9)',
        'td-10': 'var(--td-size-10)',
        'td-11': 'var(--td-size-11)',
        'td-12': 'var(--td-size-12)',
        'td-13': 'var(--td-size-13)',
        'td-14': 'var(--td-size-14)',
        'td-15': 'var(--td-size-15)',
        'td-16': 'var(--td-size-16)',
      },
    },
  },
  plugins: [],
};
