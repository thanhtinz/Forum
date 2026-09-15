import Link from 'next/link';
import { db } from '@/lib/db';
import { AnhDaiDien } from '@/components/NguoiDung';
import { gonSo } from '@/lib/tien-ich';
import { IT_NHAT, TOP } from '@/lib/tich-cuc-const';

/**
 * Mấy người viết nhiều nhất trong diễn đàn của MỘT game.
 *
 * Diễn đàn game sống bằng dăm người trả lời mọi câu hỏi của người mới. Họ
 * chẳng được gì ngoài chuyện người sau biết mặt, nên chỗ này là chỗ trả cái
 * ấy: ai đang gánh phần trả lời thì hiện tên, và người mới biết hỏi ai.
 *
 * Đếm CẢ chủ đề lẫn lời đáp: đếm mỗi lời đáp thì người chuyên mở chủ đề hay
 * bị bỏ sót, mà chủ đề mới là thứ khơi ra chuyện.
 */
export async function NguoiTichCucDienDan({ gameId }: { gameId: string }) {
  /*
   * Hai câu gộp theo người, KHÔNG phải một câu cho mỗi người.
   *
   * Prisma không nối hai bảng rồi cộng hộ được, nên gộp riêng từng bảng rồi
   * cộng ở đây — vẫn là hai câu truy vấn cố định dù diễn đàn có bao nhiêu
   * người, trong khi đếm cho từng người là mỗi người một câu.
   */
  const [tuChuDe, tuTraLoi] = await Promise.all([
    db.chuDe.groupBy({ by: ['nguoiId'], where: { gameId }, _count: { _all: true } }),
    db.traLoi.groupBy({ by: ['nguoiId'], where: { chuDe: { gameId } }, _count: { _all: true } }),
  ]);

  const dem = new Map<string, { chuDe: number; traLoi: number }>();
  for (const x of tuChuDe) {
    dem.set(x.nguoiId, { chuDe: x._count._all, traLoi: 0 });
  }
  for (const x of tuTraLoi) {
    const cu = dem.get(x.nguoiId);
    if (cu) cu.traLoi = x._count._all;
    else dem.set(x.nguoiId, { chuDe: 0, traLoi: x._count._all });
  }

  const xep = [...dem.entries()]
    .map(([id, d]) => ({ id, ...d, tong: d.chuDe + d.traLoi }))
    .filter((d) => d.tong >= IT_NHAT)
    /*
     * Khoá phụ `id` cũng cần ở đây, y như mọi chỗ phân trang: hai người bằng
     * điểm nhau mà xếp tuỳ hứng thì mỗi lần tải lại trang, thứ tự lại khác —
     * trông như bảng đang nhảy múa vì con số vừa đổi, trong khi chẳng đổi gì.
     */
    .sort((a, b) => b.tong - a.tong || (a.id < b.id ? -1 : 1))
    .slice(0, TOP);
  if (xep.length === 0) return null;

  /*
   * Người đã tự xoá tài khoản hoặc đang bị khoá thì KHÔNG lên bảng.
   *
   * Điều kiện nằm trong `where`, nên người bị loại cũng mất luôn khỏi danh
   * sách chứ không thành một hàng trống. Hàng của người đã xoá vẫn còn trong
   * cơ sở dữ liệu (bài viết của họ treo vào đấy) nhưng tên đã bị chùi sạch —
   * bày lên đây thì thành một cái tên trống dẫn tới trang không còn.
   */
  const nguoi = await db.nguoiDung.findMany({
    where: { id: { in: xep.map((x) => x.id) }, xoaLuc: null, khoa: false },
    select: { id: true, tenDangNhap: true, tenHienThi: true, anh: true },
  });
  const theoId = new Map(nguoi.map((n) => [n.id, n]));
  const hang = xep.map((x) => ({ ...x, nguoi: theoId.get(x.id) }))
    .filter((x): x is typeof x & { nguoi: NonNullable<typeof x.nguoi> } => !!x.nguoi);
  if (hang.length === 0) return null;

  return (
    <section className="the p-4">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-mo">
        Người tích cực nhất
      </h2>
      <ul className="mt-3 space-y-2.5">
        {hang.map((h) => (
          <li key={h.id}>
            <Link href={`/thanh-vien/${h.nguoi.tenDangNhap}`}
              className="group flex items-center gap-2.5">
              <AnhDaiDien ten={h.nguoi.tenHienThi} anh={h.nguoi.anh} co={30} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold group-hover:underline">
                {h.nguoi.tenHienThi}
              </span>
              {/* Nói ra con số gồm những gì, ngay tại chỗ: một con số trần
                  cạnh cái tên thì người đọc phải tự đoán nó đếm cái gì. */}
              <span className="phu shrink-0 tabular-nums text-[12px]">
                {gonSo(h.tong)} bài
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
