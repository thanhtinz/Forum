'use client';

import { useEffect, useState } from 'react';
import type { KeLaiKiep } from '@/lib/tu-tien';

/**
 * Kết quả Thiên kiếp — một trong sáu màn P0 của blueprint.
 *
 * Màn này gánh câu khó nhất ở mục 9: "khi thất bại, hệ thống phải cho thấy
 * nguyên nhân CÓ THỂ HÀNH ĐỘNG ĐƯỢC thay vì chỉ thông báo Thất bại". Nên nửa
 * dưới không phải là một dòng "Thất bại" tô đỏ, mà là bảng phân tích: hỏng ở
 * cửa nào, thiếu đúng bao nhiêu, và việc gì làm được ngay để lần sau khác đi.
 *
 * Từng đạo lôi giáng xuống theo nhịp chứ không đổ ra một lượt — cùng lý do với
 * nhật ký trận: đọc được, và cái hồi hộp của thể loại nằm đúng ở đó.
 */
const NHIP_MS = 620;

export function ManKiep({ k }: { k: KeLaiKiep }) {
  const [so, setSo] = useState(0);

  useEffect(() => {
    if (so >= k.dienBien.length) return;
    const h = setTimeout(() => setSo((n) => n + 1), NHIP_MS);
    return () => clearTimeout(h);
  }, [so, k.dienBien.length]);

  const xong = so >= k.dienBien.length;
  const cuoi = so > 0 ? k.dienBien[so - 1]! : null;
  const hp = cuoi?.hpConLai ?? k.hpDau;
  const phan = Math.max(0, Math.min(100, Math.round((hp / k.hpToiDa) * 100)));

  return (
    <section className="tien-trieu p-5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="tien-canh-gioi text-lg font-black">{k.ten}</h2>
        <span className="tien-mo text-xs">{k.soDao} đạo lôi</span>
      </div>

      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="tien-mo">Khí huyết</span>
        <span className="tabular-nums">{hp}/{k.hpToiDa}</span>
      </div>
      <div className={phan < 25 ? 'tien-thanh nguy mb-3' : 'tien-thanh mb-3'}>
        <i style={{ width: `${Math.max(2, phan)}%` }} />
      </div>

      <ol className="tien-so space-y-0.5 text-sm">
        {k.dienBien.slice(0, so).map((d, i) => (
          <li key={i}>
            {d.cau}
            {d.satThuong > 0 && <>, <b className="tien-son">{d.satThuong}</b> sát thương</>}.
          </li>
        ))}
      </ol>

      {xong && (
        k.qua ? (
          <div className="mt-3">
            <p className="tien-ngoc text-sm font-black">Qua kiếp.</p>
            <p className="tien-canh-gioi tien-vang mt-1 text-2xl font-black">{k.canhGioiMoi}</p>
            {k.tonLinhThach > 0 && (
              <p className="tien-mo mt-1 text-xs">Đã tiêu {k.tonLinhThach} linh thạch cho đồ chuẩn bị.</p>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <p className="tien-son text-sm font-black">
              {k.hong === 'than' ? 'Thân tổn — không trụ hết số đạo lôi.' : 'Đạo tâm vỡ — thân còn, đạo hỏng.'}
            </p>
            <p className="tien-mo mt-1 text-xs">
              Mất {k.matTuVi.toLocaleString('vi')} tu vi
              {k.tonLinhThach > 0 && `, tiêu ${k.tonLinhThach} linh thạch`}. Cảnh giới giữ nguyên.
            </p>

            <p className="mt-3 mb-1 text-sm font-bold">Vì sao hỏng, và làm gì bây giờ</p>
            <ul className="tien-so space-y-1 text-sm">
              {k.nguyenNhan.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        )
      )}
    </section>
  );
}
