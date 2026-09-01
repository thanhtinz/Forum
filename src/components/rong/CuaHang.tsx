'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from 'lucide-react';
import { dungDo, muaDo, type RongState } from '@/app/(site)/rong/actions';
import type { CuaHangRong } from '@/lib/rong';
import { ANH_TRUNG, RONG_DO, anhRong, tenRong } from '@/lib/rong-const';
import { cn } from '@/lib/utils';

/**
 * Cửa hàng và túi đồ.
 *
 * Mua và dùng nằm chung MỘT màn hình chứ không tách hai trang: mua xong việc
 * kế tiếp bao giờ cũng là dùng, mà tách ra thì mỗi lần mua là một lần đi lại.
 *
 * Trình duyệt chỉ gửi lên MÃ MÓN và id con rồng — giá lẫn tác dụng đọc ở máy
 * chủ. Bảng giá dưới đây chỉ để bày cho người xem.
 */
export function CuaHang({ d }: { d: CuaHangRong }) {
  const router = useRouter();
  const [tin, setTin] = useState<RongState>({});
  const [dangLam, batDau] = useTransition();
  const [dich, setDich] = useState<Record<string, string>>({});

  const goi = (fn: typeof muaDo, truong: Record<string, string>) => batDau(async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(truong)) fd.set(k, v);
    setTin(await fn({}, fd));
    router.refresh();
  });

  return (
    <div className="space-y-3">
      {tin.ke && <p className="text-sm font-medium text-emerald-600">{tin.ke}</p>}
      {tin.error && <p className="text-sm text-red-600">{tin.error}</p>}

      <section className="rong-tam p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="zib-title flex items-center gap-2"><Store size={17} /> Cửa hàng</h2>
          <span className="retro-sub text-ink-400">
            Bạn có <b className="rong-nhan">{d.diem.toLocaleString('vi')}</b> điểm
          </span>
        </div>

        <ul className="space-y-2">
          {RONG_DO.map((m) => {
            const co = d.tui[m.ma] ?? 0;
            // Đá thúc nở dùng cho trứng, mấy món kia cho rồng đã nở.
            const dungDuoc = d.dan.filter((r) => r.laTrung === m.choTrung);
            const chon = dich[m.ma] ?? '';
            return (
              <li key={m.ma} className="rong-vien rounded-xl border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <b className="text-sm">{m.ten}</b>
                  <span className="retro-sub text-ink-400">
                    {co > 0 && <>đang có <b className="rong-nhan">{co}</b> · </>}
                    {m.gia} điểm
                  </span>
                </div>
                <p className="retro-sub mt-0.5 text-ink-400">{m.moTa}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" disabled={dangLam || d.diem < m.gia}
                    onClick={() => goi(muaDo, { ma: m.ma, so: '1' })}
                    title={d.diem < m.gia ? 'Không đủ điểm' : `Mua một ${m.ten}`}
                    className="rong-nut px-3 py-1.5 text-xs disabled:opacity-50">
                    Mua
                  </button>

                  {co > 0 && (
                    dungDuoc.length === 0 ? (
                      <span className="retro-sub text-ink-400">
                        {m.choTrung ? 'Chưa có quả trứng nào để dùng.' : 'Chưa có con rồng nào đã nở.'}
                      </span>
                    ) : (
                      <>
                        <select value={chon} aria-label={`Dùng ${m.ten} cho con nào`}
                          onChange={(e) => setDich((x) => ({ ...x, [m.ma]: e.target.value }))}
                          className="input min-w-0 flex-1 py-1 text-xs">
                          <option value="">— chọn con —</option>
                          {dungDuoc.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.laTrung ? 'Trứng đang ấp' : `${r.ten || tenRong(r.loai, r.mau)} · cấp ${r.cap}`}
                            </option>
                          ))}
                        </select>
                        <button type="button" disabled={dangLam || !chon}
                          onClick={() => goi(dungDo, { ma: m.ma, rong: chon })}
                          className="btn-outline shrink-0 px-3 py-1.5 text-xs disabled:opacity-45">
                          Dùng
                        </button>
                      </>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {d.dan.length > 0 && (
        <section className="rong-tam p-4">
          <h2 className="zib-title mb-3">Đang nuôi</h2>
          <ul className="flex flex-wrap gap-3">
            {d.dan.map((r) => (
              <li key={r.id} className="w-20 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.laTrung ? ANH_TRUNG : anhRong(r.loai, r.mau)} alt=""
                  aria-hidden className={cn('mx-auto h-14 w-auto object-contain', r.laTrung && 'opacity-80')}
                  style={{ imageRendering: 'pixelated' }} />
                <p className="truncate text-[11px] font-semibold">
                  {r.laTrung ? 'Trứng' : r.ten || tenRong(r.loai, r.mau)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
