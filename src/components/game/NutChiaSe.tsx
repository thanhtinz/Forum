'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

/**
 * Nút chia sẻ trang game.
 *
 * Ưu tiên `navigator.share` — trên điện thoại nó mở đúng bảng chia sẻ của hệ
 * điều hành, có sẵn Zalo, Messenger, tin nhắn. Đó là cách người Việt gửi link
 * cho nhau, và là thứ không bản web nào tự dựng lại được.
 *
 * Máy bàn gần như không có `navigator.share`, nên lùi về chép vào bộ nhớ tạm
 * rồi báo "Đã chép". Lùi tiếp một nấc nữa cho trình duyệt cũ: chọn sẵn chữ
 * trong một ô ẩn để người dùng tự bấm Ctrl+C.
 *
 * Người dùng HUỶ bảng chia sẻ cũng ném ra lỗi y như khi hỏng thật, nên không
 * bắt lỗi để hiện thông báo — huỷ là chuyện bình thường, báo lỗi mới là lạ.
 */
export function NutChiaSe({ ten, duongDan }: { ten: string; duongDan: string }) {
  const [daChep, datDaChep] = useState(false);

  const chiaSe = async () => {
    const dia = `${window.location.origin}/game/${duongDan}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: ten, url: dia });
        return;
      } catch {
        return; // người dùng bấm huỷ — không phải lỗi
      }
    }

    try {
      await navigator.clipboard.writeText(dia);
      datDaChep(true);
      setTimeout(() => datDaChep(false), 2000);
    } catch {
      // Trình duyệt cũ hoặc trang không chạy HTTPS: bộ nhớ tạm bị chặn.
      window.prompt('Chép đường dẫn này:', dia);
    }
  };

  return (
    <button type="button" onClick={chiaSe} className="nut-vien w-full">
      {daChep
        ? <><Check size={16} aria-hidden /> Đã chép đường dẫn</>
        : <><Share2 size={16} aria-hidden /> Chia sẻ</>}
    </button>
  );
}
