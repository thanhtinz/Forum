'use client';

import { useState } from 'react';
import { Check, Share } from 'lucide-react';

/**
 * Nút chia sẻ trang game — nút TRÒN nổi ở góc trên, đúng lối App Store.
 *
 * Chỉ mỗi một hình, không kèm chữ: nó đứng chung hàng với nút lùi ở góc kia,
 * và cả hai đều là việc phụ. Đặt hẳn một nút chữ to trong luồng trang thì
 * "Chia sẻ" tranh chỗ với nút tải — mà nút tải mới là việc người ta vào đây để
 * làm. Nhãn đọc được vẫn còn nguyên trong `aria-label` cho bộ đọc màn hình.
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
 *
 * HÌNH LÀ CÁI HỘP CÓ MŨI TÊN BAY LÊN, không phải ba chấm nối nhau.
 *
 * Ba chấm nối nhau là hình chia sẻ của Android; cái hộp có mũi tên bay lên là
 * hình của iOS, và đó là hình nằm ở đúng góc này trên trang ứng dụng App Store.
 * Hai hình ấy cùng nghĩa với người đã biết, nhưng cả trang này đang mượn dáng
 * App Store — để lẫn một hình của hệ kia vào thì đúng chỗ mắt dừng lại đầu
 * tiên, người ta thấy ngay là hai thứ chắp vào nhau.
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
    <button type="button" onClick={chiaSe} className="nut-tron"
      aria-label={daChep ? 'Đã chép đường dẫn' : `Chia sẻ ${ten}`}>
      {daChep ? <Check size={18} aria-hidden /> : <Share size={18} aria-hidden />}
    </button>
  );
}
