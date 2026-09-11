import type { Config } from 'tailwindcss';

/*
 * Bảng màu khai báo bằng KÊNH RGB rời (`11 13 18`) chứ không phải mã hex.
 * Lý do: chỉ khi ấy Tailwind mới ghép được độ mờ vào — `bg-nhan/12` phải ra
 * màu nhấn 12%, mà muốn thế thì `<alpha-value>` cần chỗ để chen vào giữa.
 * Hex trong biến CSS thì mọi lớp `/…` im lặng hỏng, không báo lỗi gì cả.
 */
const mau = (ten: string) => `rgb(var(--${ten}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nen: mau('nen'),
        nen2: mau('nen2'),
        nen3: mau('nen3'),
        vien: mau('vien'),
        chu: mau('chu'),
        mo: mau('mo'),
        nhan: mau('nhan'),
        cam: mau('cam'),
        vang: mau('vang'),
        canh: mau('canh'),
        xau: mau('xau'),
        'vo-qt': mau('vo-qt'),
        'vo-qt-chu': mau('vo-qt-chu'),
      },
      borderRadius: {
        the: 'var(--bo-the)',
        nut: 'var(--bo-nut)',
        icon: 'var(--bo-icon)',
      },
      fontFamily: {
        sans: ['var(--font-chu)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: { khung: '1180px' },
      boxShadow: { noi: 'var(--bong-noi)' },
      /*
       * Tailwind chỉ nhận những mức mờ có sẵn trong bảng (5, 10, 20, 25…), nên
       * `bg-nhan/12` im lặng hỏng chứ không báo gì. Mấy mức tô nhạt của trang
       * này rơi đúng vào khoảng giữa hai nấc ấy, nên khai báo thêm.
       */
      opacity: { 12: '0.12', 15: '0.15', 18: '0.18' },
      keyframes: {
        len: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { len: 'len .22s ease-out both' },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
