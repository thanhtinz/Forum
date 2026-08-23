import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

/**
 * Bảng màu Nova — tham chiếu zibll 8.1:
 *  - primary: xanh dương #2c7bfe (link, nút chính, VIP thường)
 *  - accent : hồng #ff5473 (nhấn phụ, tim/thích)
 * Dạng "r g b" để hỗ trợ alpha qua rgb(var(--x) / <alpha>).
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    // `src/lib` cũng khai báo class Tailwind (nhãn badge, chủ đề chat…) — thiếu
    // dòng này thì class nào chỉ xuất hiện ở đó sẽ không được sinh ra CSS, và
    // bong bóng chat thành trong suốt.
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        accent: {
          400: '#ff7a94',
          500: '#ff5473',
          600: '#f5325a',
        },
        ink: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
      },
      boxShadow: {
        // Bóng glow mềm quanh card kiểu zibll (0 0 10px), không đổ hướng.
        card: '0 0 10px var(--nova-shadow)',
        'card-hover': '0 6px 22px var(--nova-shadow-strong)',
      },
      borderRadius: {
        // zibll dùng --main-radius: 8px; card lớn nhỉnh hơn chút.
        lg: '0.5rem',    // 8px
        xl: '0.5rem',    // 8px
        '2xl': '0.625rem', // 10px
      },
    },
  },
  plugins: [typography],
};

export default config;
