import { SaoNam } from '@/components/game/SaoNam';
import { ODapDanhGia } from '@/components/game/ODapDanhGia';
import { NutBaoXau } from '@/components/NutBaoXau';
import { AnhDaiDien, TenNguoi } from '@/components/NguoiDung';
import { cachDay, gop } from '@/lib/tien-ich';

/** Đúng những trường một bài đánh giá cần để vẽ ra — nơi gọi cứ `select` theo đây. */
export const CHON_DANH_GIA = {
  id: true, sao: true, noiDung: true, taoLuc: true, traLoi: true, traLoiLuc: true,
  nguoiId: true,
  nguoi: { select: { tenHienThi: true, tenDangNhap: true, anh: true } },
} as const;

export interface BaiDanhGiaData {
  id: string;
  sao: number;
  noiDung: string | null;
  taoLuc: Date;
  traLoi: string | null;
  traLoiLuc: Date | null;
  nguoiId: string;
  nguoi: { tenHienThi: string; tenDangNhap: string; anh: string | null };
}

/**
 * MỘT bài đánh giá, kèm lời đáp của cửa hàng và nút báo xấu.
 *
 * Tách ra thành phần riêng vì nay có hai nơi vẽ nó: sáu bài mới nhất ở tab
 * Thông tin, và toàn bộ ở tab Đánh giá. Để hai bản chép tay thì kiểu gì cũng
 * đến lúc sửa một bên quên bên kia — mà bên quên ấy lại là bên người ta đọc
 * nhiều hơn.
 */
export function BaiDanhGia({ d, nguoiXemId, dap, gon }: {
  d: BaiDanhGiaData;
  /** `null` là khách chưa đăng nhập. */
  nguoiXemId: string | null;
  /**
   * Việc ghi lời đáp, hoặc `null` nếu người đang xem không được đáp.
   *
   * Truyền VIỆC chứ không truyền một cờ `laQuanTri`: nay có hai người đáp được
   * — ban quản trị đáp mọi bài, tác giả chỉ đáp bài của game mình — và hai bên
   * gọi hai hàm kiểm quyền khác nhau. Cờ đúng/sai thì nơi gọi phải tự nhớ ghép
   * cờ nào với hàm nào, mà đó chính là chỗ để quên.
   */
  dap?: ((danhGiaId: string, loi: string) => Promise<{ loi?: string }>) | null;
  /**
   * Dáng THẺ TRÊN KỆ: cắt bớt lời bình còn bốn dòng.
   *
   * Kệ cuộn ngang chỉ đẹp khi mọi thẻ cao bằng nhau; một bài viết mười dòng
   * nằm cạnh một bài hai dòng thì kệ thành bậc thang. Ai muốn đọc hết thì mở
   * tấm trượt "xem tất cả" — ở đó không cắt dòng nào.
   */
  gon?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <AnhDaiDien ten={d.nguoi.tenHienThi} anh={d.nguoi.anh} co={32} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">
            <TenNguoi ten={d.nguoi.tenHienThi} tenDangNhap={d.nguoi.tenDangNhap} />
          </p>
          <p className="flex items-center gap-1.5">
            <SaoNam diem={d.sao} co={11} />
            <span className="phu">{cachDay(d.taoLuc)}</span>
          </p>
        </div>
      </div>
      {d.noiDung && (
        <p className={gop('mt-2 whitespace-pre-line text-[13px] leading-relaxed',
          gon && 'line-clamp-4')}>
          {d.noiDung}
        </p>
      )}

      {/* Lời đáp thụt vào và đổi nền để không ai đọc lẫn nó với bài của người
          chơi — đó là hai tiếng nói khác nhau. */}
      {d.traLoi && (
        <div className="mt-2.5 rounded-the bg-nen2 px-3 py-2.5">
          <p className="text-[12px] font-bold text-nhan">
            SunnyStore trả lời
            {d.traLoiLuc && <span className="phu ml-1.5 font-normal">{cachDay(d.traLoiLuc)}</span>}
          </p>
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-mo">{d.traLoi}</p>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {dap && <ODapDanhGia danhGiaId={d.id} banDau={d.traLoi} dap={dap} />}
        {/* Chỉ mời báo khi đã đăng nhập và không phải bài của chính mình —
            bài của mình thì sửa thẳng được. */}
        {nguoiXemId && nguoiXemId !== d.nguoiId && <NutBaoXau loai="danhGia" mucId={d.id} />}
      </div>
    </>
  );
}
