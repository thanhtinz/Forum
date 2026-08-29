import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtAgo } from '@/lib/utils';
import { BanBauCua } from '@/components/giaitri/BanBauCua';
import { xemBan, phienConLai } from '@/lib/bau-cua';
import {
  BAUCUA_BET_MS, BAUCUA_MAX, BAUCUA_MIN, BAUCUA_PHIEN_MOI_NGAY, BAUCUA_ROUND_MS,
} from '@/lib/mini-game';

export const metadata: Metadata = { title: 'Bầu cua tôm cá' };
export const dynamic = 'force-dynamic';

export default async function BauCuaPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [ban, me, con, lichSu] = await Promise.all([
    xemBan(userId),
    userId ? db.user.findUnique({ where: { id: userId }, select: { points: true } }) : null,
    userId ? phienConLai(userId) : Promise.resolve(0),
    db.bauCuaRound.findMany({
      where: { rolledAt: { not: null } },
      orderBy: { startAt: 'desc' },
      take: 10,
      select: { id: true, dice: true, startAt: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Bầu cua tôm cá</h1>
          {userId && <span className="retro-sub text-ink-400">Còn {con} phiên hôm nay</span>}
        </div>

        {userId ? (
          <BanBauCua
            ban0={{
              roundId: ban.roundId, conMs: ban.conMs, dangDat: ban.dangDat,
              cua: ban.cua, truoc: ban.truoc, toiDuoc: ban.toiDuoc,
            }}
            diem0={me?.points ?? 0}
          />
        ) : (
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/giai-tri/bau-cua" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để ngồi vào bàn.
          </p>
        )}
      </section>

      {lichSu.length > 0 && (
        <section className="card mt-4 p-5">
          <h2 className="zib-title mb-3">Mấy phiên vừa rồi</h2>
          <ul className="retro-stripe divide-y divide-ink-100 text-sm dark:divide-ink-800">
            {lichSu.map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-1 py-2">
                {(r.dice ?? '').split(',').map((d, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={`/hoai-niem/baucua/${d}.gif`} alt="" className="size-7 object-contain" />
                ))}
                <span className="retro-sub ml-auto text-ink-400">{fmtAgo(r.startAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
        <h2 className="zib-title mb-2">Luật chơi</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Cả nhà chung MỘT bàn. Mỗi phiên {BAUCUA_ROUND_MS / 1000} giây: {BAUCUA_BET_MS / 1000} giây đặt cửa, hết giờ hệ thống tự xóc.</li>
          <li>Đặt được nhiều cửa trong một phiên, mỗi cửa {BAUCUA_MIN}–{BAUCUA_MAX} điểm.</li>
          <li>Ba viên độc lập nhau. Cửa nào trúng mấy viên thì ăn bấy nhiêu lần tiền đặt, kèm trả lại tiền đặt.</li>
          <li>Cửa không trúng viên nào thì mất tiền đặt cửa ấy.</li>
          <li>Mỗi ngày {BAUCUA_PHIEN_MOI_NGAY} phiên.</li>
        </ul>
        <p className="mt-3 text-ink-500">
          Nói thẳng: tính cả bốn khả năng thì trung bình mỗi cửa người chơi lỗ
          khoảng <b>7,9%</b> số điểm đặt — đúng như bản gốc. Đây là chỗ tiêu điểm
          cho vui, không phải chỗ kiếm điểm.
        </p>
      </section>
    </div>
  );
}
