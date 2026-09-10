import Link from 'next/link';
import { ChevronRight, Inbox } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN, layKe } from '@/lib/kho-game';
import { BangNoiBat } from '@/components/game/BangNoiBat';
import { HangChip } from '@/components/game/HangChip';
import { KeDanhSach } from '@/components/game/KeDanhSach';
import { KeThe } from '@/components/game/KeThe';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { HE_MAY, MO_TA_HE } from '@/lib/he-may';

export const dynamic = 'force-dynamic';

/*
 * MẶT TIỀN CỬA HÀNG.
 *
 * Xếp theo thứ tự người ta thật sự đi qua khi mở một cửa hàng ứng dụng:
 *
 *   1. Chip lọc  — lối tắt cho người biết mình muốn hệ máy nào.
 *   2. Băng nổi bật — khối lớn duy nhất, chỗ dừng mắt, do người chọn tay.
 *   3. Bảng xếp hạng có ĐÁNH SỐ — dấu hiệu riêng của CH Play.
 *   4. Kệ thẻ — khoe biểu tượng, cho mục mới lên kho và mục Việt hoá.
 *   5. Thể loại — cho người chưa biết mình muốn gì.
 *
 * MỖI KHỐI PHẢI NÓI MỘT ĐIỀU KHÁC NHAU.
 *
 * Bản trước có thêm kệ "Đề xuất cho bạn" xếp theo lượt XEM, đứng ngay trên
 * bảng xếp hạng xếp theo lượt TẢI. Hai kệ ấy ra đúng chín game giống nhau
 * theo đúng một thứ tự — người đọc cuộn qua hai lần cùng một danh sách rồi
 * tưởng trang bị lặp. Cửa hàng lớn để được cả hai vì họ có hàng triệu ứng
 * dụng; kho này thì không, nên bỏ đi một.
 *
 * Cũng vì lẽ ấy mà hàng chip không liệt kê thể loại nữa: cuối trang đã có
 * hẳn một lưới thể loại đầy đủ kèm số đếm.
 *
 * Không có khối cộng đồng nào ở đây: thảo luận thuộc về TỪNG GAME và nằm
 * trong trang của game ấy.
 */

export default async function TrangChu() {
  const [noiBat, taiNhieu, moi, vietHoa, theLoai, tongGame] = await Promise.all([
    layKe({ noiBat: true }, [{ dangLuc: 'desc' }, { id: 'desc' }], 5),
    layKe({}, [{ soLuotTai: 'desc' }, { id: 'desc' }], 9),
    layKe({}, [{ dangLuc: 'desc' }, { id: 'desc' }], 12),
    layKe({ vietHoa: true }, [{ dangLuc: 'desc' }, { id: 'desc' }], 12),
    db.theLoai.findMany({
      orderBy: [{ thuTu: 'asc' }, { ten: 'asc' }],
      take: 24,
      select: {
        id: true, ten: true, duongDan: true,
        _count: { select: { game: { where: { game: DANG_HIEN } } } },
      },
    }),
    db.game.count({ where: DANG_HIEN }),
  ]);

  if (tongGame === 0) return <KhoTrong />;

  const chip = [
    { ten: 'Tất cả', duongDan: '/duyet' },
    ...HE_MAY.map((h) => ({ ten: MO_TA_HE[h].ten, duongDan: `/duyet?he=${h}` })),
    { ten: 'Có bản Việt hoá', duongDan: '/duyet?viet-hoa=1' },
    { ten: 'Điểm cao', duongDan: '/duyet?sap=diem-cao' },
  ];

  return (
    <div className="space-y-8">
      <HangChip muc={chip} />

      <BangNoiBat game={noiBat} />

      <KeDanhSach ten="Bảng xếp hạng" phu="Tải nhiều nhất từ trước tới nay"
        xemThem="/duyet?sap=tai-nhieu" game={taiNhieu} danhSo />

      <KeThe ten="Mới lên kho" phu="Vừa được thêm vào, chưa ai kịp chơi"
        xemThem="/duyet?sap=moi" game={moi} />

      <KeThe ten="Có bản Việt hoá" phu="Chơi bằng tiếng Việt, không phải đoán chữ"
        xemThem="/duyet?viet-hoa=1" game={vietHoa} />

      {theLoai.length > 0 && (
        <section>
          <h2 className="tieu-de mb-3">Thể loại</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {theLoai.map((t) => (
              <Link key={t.id} href={`/duyet?the-loai=${t.duongDan}`}
                className="the-bam flex items-center justify-between gap-2 px-4 py-3">
                <span className="truncate text-[14px] font-medium">{t.ten}</span>
                <span className="phu shrink-0">{t._count.game}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link href="/yeu-cau" className="the-bam flex items-center gap-3 px-4 py-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nhan/12 text-nhan">
          <Inbox size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">Không thấy game bạn cần?</span>
          <span className="phu block">Nhắn cho ban quản kho, chúng tôi sẽ đi tìm</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-mo" />
      </Link>
    </div>
  );
}

/**
 * Kho chưa có game nào.
 *
 * Dựng đủ sáu cái tiêu đề trên khoảng trắng thì trông như trang hỏng. Nói
 * thẳng ra là kho đang trống, và chỉ đường cho quản trị.
 */
function KhoTrong() {
  return (
    <div className="the mx-auto max-w-md p-8 text-center">
      <BieuTuongGame ten="Nova" icon={null} co={64} className="mx-auto" />
      <h1 className="mt-4 text-lg font-bold">Kho chưa có game nào</h1>
      <p className="phu mt-1.5">
        Game đầu tiên phải do quản trị viên thêm vào rồi bấm đăng. Sau đó trang
        này sẽ tự bày ra các kệ.
      </p>
      <Link href="/quan-tri/game/moi" className="nut-cai-dam mt-5">Thêm game đầu tiên</Link>
    </div>
  );
}
