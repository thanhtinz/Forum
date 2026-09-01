'use client';

import Link from 'next/link';
import { Egg } from 'lucide-react';
import type { ChuongRong as DuLieu } from '@/lib/rong';
import { CHUONG_TOI_DA, anhRong, tenRong } from '@/lib/rong-const';
import { TheHe } from './TheHe';
import { TheRong } from './TheRong';
import { TinRong, useViecRong } from './dung-viec';

/**
 * Chuồng rồng — trang chính của đảo.
 *
 * Chỉ bày rồng ĐÃ NỞ. Trứng dời hẳn sang trang ấp trứng: trước đây trứng và
 * rồng nằm chung một lưới nên chuồng sáu ô có thể toàn trứng, mà trứng thì
 * chẳng cho ăn hay cử ra trận được — nhìn như một chuồng hỏng.
 */
export function ChuongRong({ d }: { d: DuLieu }) {
  // Không cần đồng hồ chạy: ba trục chăm sóc tính ở máy chủ theo từng lượt mở
  // trang, chứ không còn cái hẹn giờ nào để đếm ngược nữa.
  const { tin, dangLam, lam } = useViecRong(d.now);
  // Con "đứng đầu chuồng": con đang ra trận, không có thì con đầu danh sách.
  // Chính nó cho khung cảnh tông màu, nên nó phải xuất hiện trong khung cảnh
  // ấy — bằng không người xem không hiểu vì sao hôm nay đảo màu tía.
  const dai = d.dan.find((r) => r.raTran) ?? d.dan[0] ?? null;

  return (
    <div className="space-y-3">
      <TinRong tin={tin} />

      {dai && (
        <section className="rong-canh relative overflow-hidden rounded-2xl px-4 py-5">
          <div className="relative flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={anhRong(dai.loai, dai.mau)} alt="" aria-hidden
              className="rong-bay size-24 shrink-0 object-contain drop-shadow-lg"
              style={{ imageRendering: 'pixelated' }} />
            <div className="min-w-0">
              <p className="truncate text-lg font-black">
                {dai.ten || tenRong(dai.loai, dai.mau)}
              </p>
              <p className="flex flex-wrap items-center gap-1.5 text-sm opacity-90">
                <TheHe he={dai.suc.he} />
                {tenRong(dai.loai, dai.mau)} · cấp {dai.cap}
                {dai.raTran && ' · đang ra trận'}
              </p>
              <p className="mt-1 text-xs opacity-80">
                Công {dai.suc.cong} · Thủ {dai.suc.thu} · Nhanh {dai.suc.nhanh}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rong-tam p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="zib-title">Chuồng rồng</h2>
          <span className="retro-sub text-ink-400">
            {d.dan.length + d.soTrung}/{CHUONG_TOI_DA} chỗ
          </span>
        </div>

        {d.dan.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-ink-400">
            <Egg size={40} className="rong-nhan opacity-70" />
            <p className="text-sm">
              {d.soTrung > 0
                ? `Bạn đang ấp ${d.soTrung} quả trứng. Chưa con nào nở cả.`
                : 'Chuồng còn trống.'}
            </p>
            <Link href="/rong/ap-trung" className="rong-nut px-4 py-2 text-sm">
              Sang lò ấp trứng
            </Link>
          </div>
        ) : (
          // Hai cột là hết. Ba cột trên trang rộng thì mỗi thẻ còn ~230px, tên
          // rồng cụt ngay và ba chỉ số phải xuống dòng.
          <ul className="grid gap-3 sm:grid-cols-2">
            {d.dan.map((r) => (
              <TheRong key={r.id} r={r} dangLam={dangLam}
                onViec={(v, t) => lam(v as 'an', t)} />
            ))}
          </ul>
        )}

        {d.soTrung > 0 && d.dan.length > 0 && (
          <p className="retro-sub mt-3 text-ink-400">
            Còn {d.soTrung} quả trứng đang ấp —{' '}
            <Link href="/rong/ap-trung" className="rong-nhan font-semibold hover:underline">
              xem ở lò ấp
            </Link>.
          </p>
        )}
      </section>
    </div>
  );
}
