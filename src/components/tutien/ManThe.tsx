'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { danhNhau, diChuyen, type TienState } from '@/app/(site)/tu-tien/actions';
import type { NhanVatXem, OXem } from '@/lib/tu-tien';
import { BAN_DO_TEN } from '@/lib/tu-tien-const';
import { NhatKyTran } from './NhatKyTran';

/**
 * Một ô trên bản đồ.
 *
 * Bố cục học thẳng từ mấy game wap Trung Quốc cùng dòng: tên nơi kèm toạ độ,
 * rồi thứ có ở ô này, rồi "chọn lối ra" ghi rõ mỗi hướng dẫn đi đâu, rồi một
 * dòng tả cảnh. Cả màn hình là một danh sách chữ dọc — không cần ảnh nào mà
 * vẫn ra thế giới, và trên màn hình điện thoại hẹp thì đọc dễ hơn bản đồ vẽ.
 *
 * Quái bày thành liên kết ngay trong dòng, hai con cùng loài đứng cạnh nhau —
 * cũng đúng lối ấy.
 */
export function ManThe({ nv, o }: { nv: NhanVatXem; o: OXem }) {
  const router = useRouter();
  const [tin, setTin] = useState<TienState>({});
  const [dangLam, batDau] = useTransition();

  const goi = (fn: typeof diChuyen, truong: Record<string, string>) => batDau(async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(truong)) fd.set(k, v);
    setTin(await fn({}, fd));
    router.refresh();
  });

  const kietSuc = nv.hp <= 1;

  return (
    <div className="space-y-3">
      {/* Có nhật ký trận thì GIẤU câu tường thuật: in sẵn "hạ được, +34 tu vi"
          lên đầu là lộ hết trước khi hiệp một kịp chạy. Lỗi thì vẫn phải hiện. */}
      {tin.tran ? (
        tin.error && <p className="tien-son text-sm font-semibold">{tin.error}</p>
      ) : (
        <>
          {tin.ke && <p className="tien-ngoc text-sm font-semibold">{tin.ke}</p>}
          {tin.error && <p className="tien-son text-sm font-semibold">{tin.error}</p>}
        </>
      )}

      {tin.tran && <NhatKyTran key={JSON.stringify(tin.tran.dienBien)} t={tin.tran} />}

      <section className="tien-giay p-5">
        <p className="mb-1 text-lg font-black">
          {o.ten} <span className="text-sm font-normal opacity-60">({o.x},{o.y})</span>
        </p>
        <p className="mb-3 text-xs opacity-60">{BAN_DO_TEN}</p>

        <div className="mb-1 flex items-baseline justify-between text-xs opacity-75">
          <span>Khí huyết</span>
          <span className="tabular-nums">{nv.hp}/{nv.suc.hpToiDa}</span>
        </div>
        <div className="tien-thanh mb-3">
          <i style={{ width: `${Math.max(2, Math.round((nv.hp / nv.suc.hpToiDa) * 100))}%` }} />
        </div>
        {kietSuc && (
          <p className="tien-son mb-3 text-sm font-semibold">
            Thương thế còn nặng, nghỉ cho lại sức đã — khí huyết tự hồi theo giờ.
          </p>
        )}

        {o.quai.length > 0 && (
          <p className="mb-3 text-sm">
            <span className="opacity-70">Ở đây có: </span>
            {o.quai.map((q, i) => (
              <span key={`${q.ma}-${q.thu}`}>
                {i > 0 && ', '}
                <button type="button" disabled={dangLam || kietSuc}
                  onClick={() => goi(danhNhau, { quai: q.ma })}
                  title={`Cấp ${q.cap} · ${q.hp} máu · công ${q.cong} · thủ ${q.thu}`}
                  className="tien-son font-semibold underline underline-offset-2 disabled:no-underline disabled:opacity-45">
                  {q.ten}
                </button>
              </span>
            ))}
          </p>
        )}

        <p className="mb-1 text-sm opacity-70">Chọn lối ra:</p>
        <ul className="mb-3 space-y-1 text-sm">
          {o.loiRa.map((r) => (
            <li key={r.huong}>
              <span className="opacity-60">{r.tenHuong}: </span>
              <button type="button" disabled={dangLam}
                onClick={() => goi(diChuyen, { den: r.ma })}
                className="font-semibold underline underline-offset-2 disabled:no-underline disabled:opacity-45">
                {r.ten}
              </button>
            </li>
          ))}
        </ul>

        <p className="text-sm opacity-75">{o.moTa}</p>
      </section>
    </div>
  );
}
