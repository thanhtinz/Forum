import type { NhanVatXem } from '@/lib/tu-tien';
import { THUOC_TINH } from '@/lib/tu-tien-const';

/**
 * Thẻ nhân vật: cảnh giới, tu vi, đạo, linh căn, tám thuộc tính.
 *
 * GDD mục 26.3: "Người chơi phải nhìn được lý do mình mạnh lên." Nên thẻ này
 * bày cả tốc độ tu vi mỗi phút chứ không giấu vào đâu — nhìn là biết chỉnh cái
 * gì thì nhanh hơn.
 */
export function TheNhanVat({ nv }: { nv: NhanVatXem }) {
  const phan = nv.tuViCan > 0
    ? Math.min(100, Math.round((nv.tuVi / nv.tuViCan) * 100))
    : 100;

  return (
    <section className="tien-trieu p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-black">{nv.ten}</h2>
        <span className="text-sm opacity-75">
          {nv.tenDao} · linh căn {nv.tenLinhCan}
        </span>
      </div>

      <p className="tien-son mb-1 text-2xl font-black">{nv.tenCanhGioi}</p>

      <div className="mb-1 flex items-baseline justify-between text-xs opacity-75">
        <span>Tu vi</span>
        <span>
          {nv.kichTran
            ? 'đã tới trần của giai đoạn này'
            : `${nv.tuVi.toLocaleString('vi')} / ${nv.tuViCan.toLocaleString('vi')}`}
        </span>
      </div>
      <div className="tien-thanh mb-3"><i style={{ width: `${Math.max(2, phan)}%` }} /></div>

      {!nv.kichTran && (
        <p className="mb-3 text-sm">
          {nv.laDotPha
            ? <>Đầy tầng này là tới cửa <b className="tien-son">đột phá</b> — phải độ kiếp mới qua bậc mới.</>
            : <>Đầy tầng này thì tự lên tầng kế tiếp.</>}
        </p>
      )}

      <ul className="grid gap-x-5 gap-y-1 text-sm sm:grid-cols-2">
        {THUOC_TINH.map((t) => (
          <li key={t.ma} className="flex items-baseline justify-between gap-2 border-b pb-0.5"
            style={{ borderColor: 'var(--tien-vien)' }}>
            <span className="opacity-80">{t.ten}</span>
            <b className="tabular-nums">{nv.thuocTinh[t.ma] ?? 0}</b>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs opacity-70">
        Tu vi {nv.moiPhut.toFixed(2)}/phút · Linh thạch {nv.linhThach.toLocaleString('vi')}
      </p>
    </section>
  );
}
