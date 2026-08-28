/**
 * Chữ có dấu → chuỗi dùng được trên địa chỉ.
 *
 * Trước nằm trong `post-form.ts` của mục bài viết. Mục ấy đã bỏ mà câu lạc bộ
 * vẫn cần đặt địa chỉ từ tên, nên tách riêng ra đây thay vì để nó chết theo.
 */
export function toSlug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'khong-ten';
}
