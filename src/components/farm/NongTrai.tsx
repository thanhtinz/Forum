'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  banNongSan, gieoHat, haiCayKhe, moODat, thuHoach, tuoiNuoc, type FarmState,
} from '@/app/(site)/nong-trai/actions';
import type { NongTrai as DuLieu } from '@/lib/farm';
import {
  ANH_CAY_KHE, ANH_CAY_KHE_CHIN, ANH_CUA_HANG, ANH_MUA_DAT, ANH_NHA_KHO,
  KHE_MAX, KHE_MIN, O_DAT_TOI_DA, anhNongSan, changCua, moTaConLai, moTaVu,
} from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { ManhDat } from './ManhDat';

/**
 * Nông trại — một màn hình, mọi việc làm ngay tại chỗ.
 *
 * Toàn bộ thao tác đi qua `useTransition` gọi thẳng server action, chứ không
 * bọc mỗi việc trong một `<form>` riêng: sáu việc mà sáu form thì trang đầy
 * thẻ ẩn, còn ở đây việc nào cũng chỉ là "ô nào, cây nào, bao nhiêu".
 *
 * Đồng hồ lấy mốc từ máy chủ (`d.now`) rồi mới tự chạy tiếp: nếu lần dựng đầu
 * ở trình duyệt đã dùng `Date.now()` của máy người xem thì máy nào lệch giờ là
 * React kêu sai lệch dựng hình ngay giây đầu tiên.
 */

type ViecLam = (prev: FarmState, formData: FormData) => Promise<FarmState>;

export function NongTrai({ d }: { d: DuLieu }) {
  const router = useRouter();
  const [now, setNow] = useState(d.now);
  const [tin, setTin] = useState<FarmState>({});
  const [dangLam, batDau] = useTransition();
  const [oChon, setOChon] = useState<number | null>(null);
  const [banBaoNhieu, setBanBaoNhieu] = useState<Record<string, number>>({});

  // Đồng hồ nhích mỗi giây để đếm ngược chạy mà không phải hỏi lại máy chủ.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Ô vừa chín thì tải lại trang một lần cho nút "Thu hoạch" hiện ra đúng lúc.
  const soODaChin = d.oDat.filter((o) => changCua(o.plantedAt, o.readyAt, now) === 'chin').length;
  useEffect(() => {
    if (soODaChin > 0) router.refresh();
  }, [soODaChin, router]);

  const lam = (viec: ViecLam, truong: Record<string, string | number>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(truong)) fd.set(k, String(v));
    batDau(async () => {
      setTin(await viec({}, fd));
      router.refresh();
    });
  };

  const o = oChon == null ? null : d.oDat.find((x) => x.index === oChon) ?? null;
  const changO = o ? changCua(o.plantedAt, o.readyAt, now) : null;
  const kheSanSang = now >= d.kheSanSangLuc;

  // Sắp cây theo giá hạt: nhìn từ trái sang là thấy ngay bậc thang rẻ → đắt.
  const cay = useMemo(
    () => [...d.cayGiong].sort((a, b) => a.seedCost - b.seedCost),
    [d.cayGiong],
  );

  return (
    <div className="space-y-4">
      {/* Thanh tình hình. Không in số điểm ở đây: nó đã nằm sẵn trên thanh đầu
          trang, nhắc lại chỉ tổ có hai con số phải giữ cho khớp nhau. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{d.soODaMo}/{O_DAT_TOI_DA} ô đất</span>
        <span className="chip">{d.banNgay ? 'Ban ngày' : 'Ban đêm'}</span>
      </div>

      <ManhDat
        oDat={d.oDat} now={now} banNgay={d.banNgay}
        dangChon={oChon} onChon={(i) => setOChon((cu) => (cu === i ? null : i))}
      />

      {tin.ke && <p className="text-sm font-medium text-emerald-600">{tin.ke}</p>}
      {tin.error && <p className="text-sm text-red-600">{tin.error}</p>}

      {/* ── Việc của ô đang chọn ── */}
      <section className="card p-4">
        <h2 className="zib-title mb-3">
          {o ? `Ô đất số ${o.index + 1}` : 'Chọn một ô đất'}
        </h2>

        {!o && (
          <p className="text-sm text-ink-500">
            Bấm vào một ô trên mảnh đất phía trên để gieo hạt, tưới nước hoặc thu hoạch.
          </p>
        )}

        {/* Ô trống → bày cửa hàng hạt giống ngay tại đây */}
        {o && o.cropKey == null && (
          <>
            <p className="mb-3 flex items-center gap-2 text-sm text-ink-500">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ANH_CUA_HANG} alt="" aria-hidden className="size-8"
                style={{ imageRendering: 'pixelated' }} />
              Chọn giống để gieo. Tưới một lần trong vụ thì được mùa.
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {cay.map((c) => {
                const du = d.diem >= c.seedCost;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={dangLam || !du}
                      onClick={() => lam(gieoHat, { o: o.index, cay: c.id })}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-xl border-2 border-ink-100 p-2 text-left transition-all',
                        'hover:-translate-y-0.5 hover:border-emerald-300 dark:border-ink-800',
                        !du && 'cursor-not-allowed opacity-45 hover:translate-y-0',
                      )}
                      title={du ? `Gieo ${c.name}` : `Cần ${c.seedCost} điểm`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={anhNongSan(c.key)} alt="" aria-hidden className="size-8 shrink-0"
                        style={{ imageRendering: 'pixelated' }} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{c.name}</span>
                        <span className="retro-sub block text-ink-400">
                          {c.seedCost}đ · {moTaVu(c.growMinutes)} · thu {c.yieldMin}–{c.yieldMax}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Đang lớn → tưới nước */}
        {o && o.cropKey != null && changO !== 'chin' && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              <b>{o.cropName}</b> · còn {moTaConLai((o.readyAt ?? 0) - now)}
              {o.watered && <span className="ml-1 text-sky-600">· đã tưới</span>}
            </p>
            <button
              type="button"
              disabled={dangLam || o.watered}
              onClick={() => lam(tuoiNuoc, { o: o.index })}
              className="btn-primary disabled:opacity-50"
            >
              {o.watered ? 'Vụ này tưới rồi' : 'Tưới nước (miễn phí)'}
            </button>
          </div>
        )}

        {/* Đã chín → thu hoạch */}
        {o && o.cropKey != null && changO === 'chin' && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm"><b>{o.cropName}</b> đã chín, hái vào kho thôi.</p>
            <button
              type="button"
              disabled={dangLam}
              onClick={() => lam(thuHoach, { o: o.index })}
              className="btn-primary disabled:opacity-50"
            >
              Thu hoạch
            </button>
          </div>
        )}
      </section>

      {/* ── Nhà kho ── */}
      <section className="card p-4">
        <h2 className="zib-title mb-3 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ANH_NHA_KHO} alt="" aria-hidden className="size-7"
            style={{ imageRendering: 'pixelated' }} />
          Nhà kho
        </h2>

        {d.kho.length === 0 ? (
          <p className="text-sm text-ink-500">Kho đang trống. Thu hoạch xong nông sản sẽ nằm ở đây.</p>
        ) : (
          <ul className="space-y-2">
            {d.kho.map((m) => {
              const so = Math.min(banBaoNhieu[m.cropId] ?? m.qty, m.qty);
              return (
                <li key={m.cropId} className="flex flex-wrap items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={anhNongSan(m.cropKey)} alt="" aria-hidden className="size-8"
                    style={{ imageRendering: 'pixelated' }} />
                  <span className="min-w-28 text-sm font-bold">{m.name}</span>
                  <span className="retro-sub text-ink-400">
                    có {m.qty} · {m.sellPrice}đ/quả
                  </span>
                  <input
                    type="number" min={1} max={m.qty} value={so}
                    aria-label={`Số ${m.name} muốn bán`}
                    onChange={(e) =>
                      setBanBaoNhieu((v) => ({
                        ...v,
                        [m.cropId]: Math.max(1, Math.min(m.qty, Number(e.target.value) || 1)),
                      }))
                    }
                    className="input !w-20"
                  />
                  <button
                    type="button"
                    disabled={dangLam}
                    onClick={() => lam(banNongSan, { cay: m.cropId, so_luong: so })}
                    className="btn-ghost disabled:opacity-50"
                  >
                    Bán {so * m.sellPrice}đ
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Cây khế và mở đất ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card flex items-center gap-3 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={kheSanSang ? ANH_CAY_KHE_CHIN : ANH_CAY_KHE}
            alt="Cây khế" className="size-16 shrink-0"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="min-w-0">
            <p className="text-sm font-bold">Cây khế</p>
            <p className="retro-sub mb-2 text-ink-400">
              {kheSanSang
                ? `Có quả rồi, hái được ${KHE_MIN}–${KHE_MAX} điểm.`
                : `Ra quả sau ${moTaConLai(d.kheSanSangLuc - now)}.`}
            </p>
            <button
              type="button"
              disabled={dangLam || !kheSanSang}
              onClick={() => lam(haiCayKhe, {})}
              className="btn-primary disabled:opacity-50"
            >
              Hái khế
            </button>
          </div>
        </section>

        <section className="card flex items-center gap-3 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ANH_MUA_DAT} alt="Mua đất" className="size-16 shrink-0"
            style={{ imageRendering: 'pixelated' }} />
          <div className="min-w-0">
            <p className="text-sm font-bold">Mở thêm ô đất</p>
            <p className="retro-sub mb-2 text-ink-400">
              {d.giaMoO == null
                ? `Đã mở hết ${O_DAT_TOI_DA} ô.`
                : `Ô thứ ${d.soODaMo + 1} giá ${d.giaMoO} điểm.`}
            </p>
            <button
              type="button"
              disabled={dangLam || d.giaMoO == null || d.diem < d.giaMoO}
              onClick={() => lam(moODat, {})}
              className="btn-primary disabled:opacity-50"
            >
              {d.giaMoO == null ? 'Hết đất để mở' : `Mua ${d.giaMoO} điểm`}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
