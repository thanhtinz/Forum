/**
 * Lối đi của bảng tác giả.
 *
 * Để riêng một tệp, không để trong `layout.tsx`: Next chỉ cho tệp bố cục
 * export đúng vài thứ nó biết (`metadata`, `dynamic`, bố cục mặc định…), nên
 * một hằng số lạ nằm đó là cả bản dựng hỏng — và câu báo lỗi chỉ nói "không
 * khớp kiểu bố cục", không nói vì sao.
 */
export const LOI_DI_TAC_GIA = [
  { dich: '/quan-ly', ten: 'Tổng quan', hinh: 'LayoutDashboard' },
  { dich: '/quan-ly/game', ten: 'Game của tôi', hinh: 'Gamepad2' },
  { dich: '/quan-ly/ho-so', ten: 'Hồ sơ tác giả', hinh: 'UserRound' },
] as const;
