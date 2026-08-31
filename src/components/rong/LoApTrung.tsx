'use client';

import Link from 'next/link';
import { Egg } from 'lucide-react';
import type { OApTrung } from '@/lib/rong';
import { AP_MS, CHUONG_TOI_DA, GIA_NO_NGAY, GIA_TRUNG, moTaConLai } from '@/lib/rong-const';
import { TheTrung } from './TheTrung';
import { TinRong, useViecRong } from './dung-viec';

/** Lò ấp: mua trứng, ngắm trứng, thúc cho nở. */
export function LoApTrung({ d }: { d: OApTrung }) {
  const { now, tin, dangLam, lam } = useViecRong(d.now);

  return (
    <div className="space-y-3">
      <TinRong tin={tin} />

      <section className="rong-tam p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="zib-title flex items-center gap-2"><Egg size={17} /> Lò ấp trứng</h2>
          <button type="button" disabled={dangLam || d.conCho <= 0}
            onClick={() => lam('trung')}
            title={d.conCho > 0 ? `Mua trứng · ${GIA_TRUNG} điểm` : 'Chuồng đã đầy'}
            className="rong-nut px-3 py-2 text-sm disabled:opacity-50">
            Mua trứng · {GIA_TRUNG} điểm
          </button>
        </div>
        <p className="retro-sub mb-3 text-ink-400">
          Trứng nở sau {moTaConLai(AP_MS)}; sốt ruột thì trả thêm {GIA_NO_NGAY} điểm cho nở ngay.
          Còn {d.conCho} chỗ trong chuồng {CHUONG_TOI_DA} ô.
        </p>

        {d.trung.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">
            Chưa có quả trứng nào đang ấp.{' '}
            {d.soRong > 0 && (
              <Link href="/rong" className="rong-nhan font-semibold hover:underline">
                Về chuồng
              </Link>
            )}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {d.trung.map((t) => (
              <TheTrung key={t.id} t={t} now={now} dangLam={dangLam}
                onViec={(v, truong) => lam(v, truong)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
