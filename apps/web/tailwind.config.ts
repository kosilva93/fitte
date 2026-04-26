import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f5f5f5',
          900: '#0a0a0a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
