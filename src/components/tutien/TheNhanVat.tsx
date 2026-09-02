import type { NhanVatXem } from '@/lib/tu-tien';
import { HP_HOI_MOI_GIO, THUOC_TINH } from '@/lib/tu-tien-const';

/**
 * Thẻ nhân vật: cảnh giới, tu vi, đạo, linh căn, tám thuộc tính.
 *
 * GDD mục 26.3: "Người chơi phải nhìn được lý do mình mạnh lên." Blueprint mục
 * 9 đòi gắt hơn: người mới phải trả lời được TRONG VÀI GIÂY ba câu — mình ở
 * cảnh giới nào, đạo chính là gì, việc đáng làm nhất tiếp theo là gì. Nên ba
 * thứ ấy chiếm hẳn phần đầu thẻ, còn tám thuộc tính lùi xuống dưới.
 *
 * Hai thanh ở đây đều làm đủ bốn thứ blueprint mục 5 đòi ở một resource bar:
 * giá trị hiện tại, giới hạn, TỐC ĐỘ và TRẠNG THÁI NGUY HIỂM.
 */
export function TheNhanVat({ nv }: { nv: NhanVatXem }) {
  const phan = nv.tuViCan > 0
    ? Math.min(100, Math.round((nv.tuVi / nv.tuViCan) * 100))
    : 100;

  const phanHp = Math.round((nv.hp / nv.suc.hpToiDa) * 100);
  // Dưới một phần tư máu thì không đi đánh nữa được — đúng ngưỡng mà `danhQuai`
  // hay kết thúc bằng thua, nên báo nguy từ đây chứ không đợi còn 1 máu.
  const nguy = phanHp < 25;

  return (
    <section className="tien-trieu p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-black">{nv.ten}</h2>
        <span className="tien-dao-mau text-sm font-semibold">
          {nv.tenDao} · linh căn {nv.tenLinhCan}
        </span>
      </div>

      <p className="tien-canh-gioi tien-vang mb-1 text-2xl font-black">{nv.tenCanhGioi}</p>

      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="tien-mo">Tu vi</span>
        <span className="tabular-nums">
          {nv.kichTran
            ? 'đã tới trần của giai đoạn này'
            : <>
                {nv.tuVi.toLocaleString('vi')} / {nv.tuViCan.toLocaleString('vi')}
                <span className="tien-mo"> · +{nv.moiPhut.toFixed(2)}/phút</span>
              </>}
        </span>
      </div>
      <div className="tien-thanh mb-3"><i style={{ width: `${Math.max(2, phan)}%` }} /></div>

      {!nv.kichTran && (
        <p className="mb-3 text-sm">
          {nv.laDotPha
            ? <>Đầy tầng này là tới cửa <b className="tien-vang">đột phá</b> — phải độ kiếp mới qua bậc mới.</>
            : <>Đầy tầng này thì tự lên tầng kế tiếp.</>}
        </p>
      )}

      <div className="mb-3 border-t pt-2" style={{ borderColor: 'var(--tien-vien)' }}>
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="tien-mo">Khí huyết</span>
          <span className="tabular-nums">
            {nv.hp}/{nv.suc.hpToiDa}
            {nguy && <span className="tien-son"> · thương thế nặng</span>}
            {nv.hp < nv.suc.hpToiDa && (
              <span className="tien-mo"> · hồi {HP_HOI_MOI_GIO}/giờ</span>
            )}
          </span>
        </div>
        <div className={nguy ? 'tien-thanh nguy' : 'tien-thanh'}>
          <i style={{ width: `${Math.max(2, phanHp)}%` }} />
        </div>
        <p className="mt-2 text-sm">
          Công <b>{nv.suc.cong}</b> · Thủ <b>{nv.suc.thu}</b> · Nhanh <b>{nv.suc.nhanh}</b>
        </p>
      </div>

      {/*
        Blueprint mục 5 đòi stat row "chạm để mở giải thích". Trên điện thoại
        `title` không mở được bằng ngón tay, nên giải thích nằm trong một
        `<details>` — chạm là bung, và bung ra là bảng CHỖ NÀO ĂN CHỈ SỐ NÀO
        chứ không phải lời tả suông.
      */}
      <details className="group">
        <summary className="tien-mo cursor-pointer list-none text-xs font-semibold">
          Tám thuộc tính <span className="group-open:hidden">(chạm để xem dùng vào đâu)</span>
        </summary>
        <ul className="mt-2 grid gap-x-5 gap-y-1 text-sm sm:grid-cols-2">
          {THUOC_TINH.map((t) => (
            <li key={t.ma} className="border-b pb-0.5" style={{ borderColor: 'var(--tien-vien)' }}>
              <span className="flex items-baseline justify-between gap-2">
                <span>{t.ten}</span>
                <b className="tabular-nums">{nv.thuocTinh[t.ma] ?? 0}</b>
              </span>
              <span className="tien-mo block text-[11px]">{t.dung}</span>
            </li>
          ))}
        </ul>
      </details>

      <p className="tien-mo mt-3 text-xs">
        Linh thạch {nv.linhThach.toLocaleString('vi')} · đang ở {nv.tenViTri}
      </p>
    </section>
  );
}
