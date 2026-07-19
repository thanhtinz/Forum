import type { Config } from 'tailwindcss';

// Đọc màu brand từ CSS variable (định nghĩa ở globals.css :root, admin có thể
// ghi đè lúc chạy qua trang Giao diện) thay vì hex cố định, để đổi màu chủ đạo
// toàn site không cần build lại.
function brandVar(shade: number) {
  return `rgb(var(--brand-${shade}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Bảng màu xanh thép trầm như XenForo gốc (dịu mắt, không chói) — giá trị mặc định
        // nằm ở globals.css, có thể ghi đè theo site.primaryColor trong admin.
        brand: {
          50: brandVar(50), 100: brandVar(100), 200: brandVar(200), 300: brandVar(300),
          400: brandVar(400), 500: brandVar(500), 600: brandVar(600), 700: brandVar(700),
          800: brandVar(800), 900: brandVar(900), 950: brandVar(950),
        },
        ink: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
      },
      boxShadow: {
        // Bóng mềm, khuếch tán nhẹ kiểu zibll.
        card: '0 2px 12px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.03)',
        'card-hover': '0 10px 30px rgba(15,23,42,0.10), 0 4px 10px rgba(15,23,42,0.05)',
      },
    },
  },
  plugins: [],
};
export default config;
