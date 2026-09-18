'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';

/**
 * THANH ĐẦU THU GỌN của trang game — hiện ra khi khối đầu đã cuộn khuất.
 *
 * Đây là tương tác dễ nhận ra nhất của App Store mà cửa hàng này còn thiếu:
 * cuộn xuống đủ sâu thì biểu tượng, tên game và nút tải KHÔNG biến mất, chúng
 * thu lại thành một hàng mỏng dính trên đỉnh màn hình.
 *
 * VÌ SAO ĐÁNG LÀM. Trang game ở đây rất dài — sự kiện, có gì mới, kệ ảnh, giới
 * thiệu, đánh giá, thông tin, quyền riêng tư, game khác. Người đọc tới mục
 * đánh giá rồi quyết định tải thì phải cuộn ngược lên tận đầu trang mới thấy
 * cái nút. Thanh này cắt hẳn đoạn đường ấy, và nó cũng trả lời câu "mình đang
 * xem game nào" cho người vừa cuộn một lúc lâu.
 *
 * Dùng `IntersectionObserver` chứ không nghe sự kiện cuộn: trình duyệt tự báo
 * khi cái mốc đi ra khỏi tầm nhìn, nên không có hàm nào chạy theo từng điểm
 * ảnh cuộn. Nghe `scroll` thì mỗi cú vuốt gọi hàm hàng trăm lần, và trên máy
 * yếu là thấy khựng ngay ở đúng thứ phải mượt nhất.
 *
 * Thanh này KHÔNG chặn thanh trên của cửa hàng: nó nằm dưới, ở `top` bằng
 * chiều cao thanh kia, và mang `z` thấp hơn.
 */
export function DauTrangGonGame({ ten, icon, duongDan }: {
  ten: string;
  icon: string | null;
  duongDan: string;
}) {
  const [hien, datHien] = useState(false);
  const mocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moc = mocRef.current;
    if (!moc) return;

    /*
     * `rootMargin` âm ở trên: coi như mốc đã khuất khi nó lên tới ngang tầm
     * thanh trên, chứ không đợi nó ra hẳn khỏi màn hình. Không có nó thì có
     * một quãng mà khối đầu đã chui xuống dưới thanh trên rồi mà thanh gọn
     * vẫn chưa hiện — người dùng thấy đúng một khoảng trống không có nút nào.
     */
    const doi = new IntersectionObserver(
      ([m]) => datHien(!m.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 },
    );
    doi.observe(moc);
    return () => doi.disconnect();
  }, []);

  return (
    <>
      {/* Mốc vô hình đặt ngay cuối khối đầu. Đo trên một thẻ rỗng chứ không đo
          trên chính khối đầu: khối ấy cao thấp tuỳ game có bìa hay không, có
          tên tiếng Việt hay không, nên lấy nó làm mốc thì mỗi game một ngưỡng. */}
      <div ref={mocRef} aria-hidden className="h-px w-full" />

      <div
        data-viec="dau-gon"
        /* `aria-hidden` khi đang ẩn: nó là bản NHẮC LẠI của khối đầu ngay trên,
           nên để bộ đọc màn hình gặp hai lần cùng một tên game và hai cái nút
           tải giống hệt nhau là làm phiền chứ không giúp gì. */
        aria-hidden={!hien}
        /*
          NỀN ĐẶC, không dùng lớp kính `kinh-tren`.

          Thanh trên của cửa hàng đã là một tấm kính rồi. Dán thêm một tấm nữa
          ngay dưới thì hai lớp mờ chồng nhau, và thanh này mang một cái NÚT
          người ta phải bấm — nút thì cần đứng rõ ràng trên một mặt phẳng rõ
          ràng, không nên nằm trên một lớp mờ chồng lên một lớp mờ khác.

          Nền đặc cũng cho nó một danh tính riêng: tấm kính trên là vỏ của cửa
          hàng, còn thanh này là của riêng game đang mở. Hai thứ khác nhau thì
          trông khác nhau.

          (Ảnh chụp bằng trình duyệt không đầu cho thấy chữ xuyên qua cả hai
          thanh, nhưng đó là do không có GPU để dựng `backdrop-filter` —
          `getComputedStyle` vẫn trả về `blur(34px)`. Không phải lỗi, đừng đi
          "sửa" lớp kính vì cái ảnh ấy.)
        */
        className={`sticky top-[var(--cao-thanh-tren)] z-20 -mx-4 border-b border-vien bg-nen px-4 transition-all duration-200 sm:mx-0 sm:rounded-b-the sm:px-4 ${
          hien
            ? 'pointer-events-auto max-h-24 opacity-100'
            : 'pointer-events-none max-h-0 overflow-hidden opacity-0'
        }`}>
        <div className="flex items-center gap-2.5 py-2">
          <BieuTuongGame ten={ten} icon={icon} co={32} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{ten}</span>
          {/* Cùng một nút, cùng một chỗ đến, như mọi nút tải khác trong cửa
              hàng — đổi dáng ở đây thì người ta phải học lại một lần nữa. */}
          <Link href={`/game/${duongDan}#tai`} className="nut-cai shrink-0" tabIndex={hien ? 0 : -1}>
            Tải về
          </Link>
        </div>
      </div>
    </>
  );
}
