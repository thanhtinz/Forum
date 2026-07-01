import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Bảng màu xanh thép trầm như XenForo gốc (dịu mắt, không chói)
        brand: {
          50: '#eef4f9', 100: '#dbe7f1', 200: '#bcd1e3', 300: '#90b1cf',
          400: '#5d8bb3', 500: '#3a6d99', 600: '#2e5a80', 700: '#274d6c',
          800: '#23425b', 900: '#1d3447', 950: '#12212e',
        },
        ink: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)',
      },
    },
  },
  plugins: [],
};
export default config;
