import Link from 'next/link';
import { veTheLoai } from '@/lib/mau-the-loai';

/**
 * LƯỚI Ô THỂ LOẠI — dáng mục "Browse" của App Store.
 *
 * Thay cho dãy chip chữ dùng trước đây. Chip hợp khi nó là BỘ LỌC đứng cạnh
 * một danh sách đang có; ở trang tìm lúc chưa gõ gì thì mười cái chip xám nằm
 * sát nhau là mười thứ na ná nhau, không cái nào mời bấm. Ô màu to bằng nửa bề
 * ngang màn hình thì mỗi thể loại là một cánh cửa, và ngón tay bấm trúng ngay
 * cả khi đang đi đường.
 *
 * Hai cột trên điện thoại, thêm cột dần khi màn rộng ra. Giữ nguyên hai cột ở
 * mọi khổ thì trên máy bàn mỗi ô rộng năm trăm điểm ảnh mà chỉ cao tám mươi —
 * bẹt thành cái thanh ngang, mất hẳn dáng cánh cửa. Thêm cột thì ô giữ đúng tỉ
 * lệ của bản điện thoại, là bản được ngắm nhiều nhất.
 */
export function LuoiTheLoai({ muc }: { muc: { ten: string; duongDan: string }[] }) {
  if (muc.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {muc.map((t, i) => {
        const { tu, den, hinh } = veTheLoai(t.duongDan, i);
        return (
          <li key={t.duongDan}>
            <Link href={`/the-loai/${t.duongDan}`}
              style={{ backgroundImage: `linear-gradient(135deg, ${tu}, ${den})` }}
              className="relative flex h-[82px] items-end overflow-hidden rounded-the p-3 transition-transform active:scale-[0.98]">
              {/* Hình nằm CHÌM một nửa ra ngoài mép trên phải, đúng lối App
                  Store: nhờ vậy nó là hoa văn của ô chứ không tranh chỗ với
                  cái tên — thứ duy nhất người ta thật sự đọc. */}
              <span aria-hidden className="pointer-events-none absolute -right-2 -top-2 text-[46px] leading-none opacity-90 drop-shadow">
                {hinh}
              </span>
              {/* Chữ trắng trên dải màu: viền chữ mờ để tên vẫn đọc được ở góc
                  sáng nhất của dải. */}
              <span className="relative text-[15px] font-bold text-white [text-shadow:0_1px_3px_rgb(0_0_0/.35)]">
                {t.ten}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
