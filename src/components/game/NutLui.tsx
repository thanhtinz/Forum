'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/**
 * Nút lùi tròn ở góc trái trên trang game.
 *
 * Dùng `router.back()` chứ không phải một liên kết cố định về `/game`: người
 * tới đây từ bảng xếp hạng thì phải về bảng xếp hạng, từ tìm kiếm thì về đúng
 * kết quả tìm kiếm ấy — đẩy tất cả về cùng một trang là cướp mất chỗ họ đang
 * đứng và bắt tìm lại từ đầu.
 *
 * Nhưng `back()` chỉ đúng khi trong lịch sử CÒN chỗ để lùi. Mở thẳng đường dẫn
 * từ tin nhắn Zalo thì tab ấy chưa có trang nào trước đó, bấm lùi là ra ngoài
 * trang hoặc chẳng ra gì cả. Nên hỏi độ dài lịch sử trước, hết đường lùi thì
 * về danh mục game — một lối đi luôn có nghĩa.
 */
export function NutLui() {
  const router = useRouter();

  const lui = () => {
    if (window.history.length > 1) router.back();
    else router.push('/game');
  };

  return (
    <button type="button" onClick={lui} className="nut-tron" aria-label="Quay lại">
      <ChevronLeft size={20} aria-hidden />
    </button>
  );
}
