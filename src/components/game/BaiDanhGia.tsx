import { SaoNam } from '@/components/game/SaoNam';
import { ODapDanhGia } from '@/components/game/ODapDanhGia';
import { NutHuuIch } from '@/components/game/NutHuuIch';
import { NutBaoXau } from '@/components/NutBaoXau';
import { TenNguoi } from '@/components/NguoiDung';
import { cachDay, gop } from '@/lib/tien-ich';

/** Đúng những trường một bài đánh giá cần để vẽ ra — nơi gọi cứ `select` theo đây. */
export const CHON_DANH_GIA = {
  id: true, sao: true, tieuDe: true, noiDung: true, taoLuc: true,
  traLoi: true, traLoiLuc: true, soHieu: true, soHuuIch: true, nguoiId: true,
  nguoi: { select: { tenHienThi: true, tenDangNhap: true, anh: true } },
} as const;

export interface BaiDanhGiaData {
  id: string;
  sao: number;
  tieuDe: string | null;
  noiDung: string | null;
  taoLuc: Date;
  traLoi: string | null;
  traLoiLuc: Date | null;
  soHieu: string | null;
  soHuuIch: number;
  nguoiId: string;
  nguoi: { tenHienThi: string; tenDangNhap: string; anh: string | null };
}

/**
 * MỘT bài đánh giá, kèm lời đáp của cửa hàng và nút báo xấu.
 *
 * Tách ra thành phần riêng vì nay có hai nơi vẽ nó: mấy bài nổi bật ở trang
 * game, và toàn bộ ở tấm trượt đánh giá. Để hai bản chép tay thì kiểu gì cũng
 * đến lúc sửa một bên quên bên kia — mà bên quên ấy lại là bên người ta đọc
 * nhiều hơn.
 *
 * THỨ TỰ TRONG THẺ: đầu đề in đậm, rồi sao — ngày — người viết trên một dòng,
 * rồi mới tới lời bình. Đây là thứ tự của App Store và nó không phải chuyện
 * trang trí: trên kệ cuộn ngang mỗi thẻ chỉ được liếc chừng một giây, mà thứ
 * đọc được trong một giây là một câu in đậm chứ không phải tên người lạ.
 */
export function BaiDanhGia({ d, nguoiXemId, dap, gon, banDauBam }: {
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
  /** Người đang xem đã bấm hữu ích cho bài này chưa. */
  banDauBam?: boolean;
}) {
  return (
    <>
      {/* Không có đầu đề thì dựng tạm một câu từ số sao, chứ không bỏ trống:
          thiếu dòng đậm ở đầu là thẻ ấy cao khác hẳn mấy thẻ bên cạnh, kệ
          thành bậc thang ngay. Bài viết từ trước đợt có đầu đề rơi vào đây. */}
      <p className="text-[15px] font-bold leading-snug">
        {d.tieuDe ?? `${d.sao} sao`}
      </p>

      <p className="mt-1 flex flex-wrap items-center gap-x-1.5">
        <SaoNam diem={d.sao} co={12} />
        {/* Số hiệu bản in cạnh ngày, đúng lối App Store: một lời chê nát
            ở bản 1.0 đọc khác hẳn khi biết game nay đã ở bản 3.0. */}
        <span className="phu">
          {cachDay(d.taoLuc)}
          {d.soHieu && ` · bản ${d.soHieu}`}
          {' · '}
          <TenNguoi ten={d.nguoi.tenHienThi} tenDangNhap={d.nguoi.tenDangNhap} />
        </span>
      </p>

      {d.noiDung && (
        <p className={gop('mt-2 whitespace-pre-line text-[13px] leading-relaxed text-mo',
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

      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        {/* Bài của chính mình thì không mời bấm hữu ích cho bài mình — nhưng
            vẫn in con số, vì đó là thứ tác giả bài muốn biết nhất. */}
        <NutHuuIch danhGiaId={d.id} dem={d.soHuuIch} banDauBam={banDauBam ?? false}
          bamDuoc={!!nguoiXemId && nguoiXemId !== d.nguoiId} />
        {dap && <ODapDanhGia danhGiaId={d.id} banDau={d.traLoi} dap={dap} />}
        {/* Chỉ mời báo khi đã đăng nhập và không phải bài của chính mình —
            bài của mình thì sửa thẳng được. */}
        {nguoiXemId && nguoiXemId !== d.nguoiId && <NutBaoXau loai="danhGia" mucId={d.id} />}
      </div>
    </>
  );
}
