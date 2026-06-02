/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan all TSX/TS files in src/ for Tailwind class usage
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  corePlugins: {
    // Disable Preflight (Tailwind's CSS reset) to avoid conflicts with existing SCSS globals
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
