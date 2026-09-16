import { notFound } from 'next/navigation';

/*
 * TUYẾN VÉT — mọi đường dẫn không khớp tuyến nào rơi vào đây.
 *
 * Trước đây trang 404 là `src/app/not-found.tsx`, đặt ở NGOÀI mọi nhóm tuyến.
 * Nhưng cửa hàng có bốn bố cục gốc (cửa hàng, quản trị, tác giả, cổng cộng
 * tác), mỗi cái nằm trong một nhóm riêng, nên ở mức trên cùng KHÔNG còn bố cục
 * nào — Next từ chối dựng tệp ấy, và từ chối luôn cả `/_not-found`. Mà
 * `/_not-found` hỏng thì mọi lượt gọi sau đó đều trả 500, kể cả những trang
 * hoàn toàn bình thường: gõ sai một địa chỉ là cả cửa hàng thành lỗi máy chủ
 * cho tới lần khởi động lại.
 *
 * Nên gõ sai địa chỉ giờ rơi vào ĐÂY — một trang thật, nằm trong nhóm cửa
 * hàng — rồi `notFound()` ném lên `(cua-hang)/not-found.tsx`. Người gõ nhầm
 * thấy trang 404 tiếng Việt có đủ thanh bên và tab đáy, tức là còn lối đi
 * tiếp, chứ không phải một trang cụt.
 *
 * Tuyến vét luôn xếp SAU mọi tuyến có thật, nên nó không che mất trang nào.
 */
export default function KhongKhopTuyenNao() {
  notFound();
}
