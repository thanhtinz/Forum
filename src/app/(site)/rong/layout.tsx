import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CHUONG_TOI_DA, DAU_MOI_NGAY, DU_BO, dauNgayVN } from '@/lib/rong-const';
import { bienCanhRong } from '@/lib/rong-giao-dien';
import { ThanhTab } from '@/components/rong/ThanhTab';

export const dynamic = 'force-dynamic';

/**
 * Khung chung cho mọi trang của Đảo Rồng.
 *
 * Thanh tab nằm ở đây chứ không rải vào từng trang, đúng lối Đảo Pokémon: sáu
 * lối đi mà mỗi trang con chỉ có một liên kết "quay lại" thì đi từ chuồng sang
 * cửa hàng mất hai lần chạm. Chưa nuôi con nào thì không dựng thanh nào cả —
 * lúc ấy chỉ có đúng một việc để làm là mua quả trứng đầu tiên.
 */
export default async function KhungRong({ children }: { children: ReactNode }) {
  const s = await auth();
  const userId = s?.user?.id;

  const dan = userId
    ? await db.rong.findMany({
      where: { userId },
      select: { id: true, mau: true, noAt: true, apXongAt: true, raTran: true },
      orderBy: [{ raTran: 'desc' }, { createdAt: 'asc' }],
      take: CHUONG_TOI_DA,
    })
    : [];

  let nhan: Record<string, string> | undefined;
  let mauCanh = 1;

  if (dan.length > 0) {
    const now = Date.now();
    // Tông màu ăn theo con đang cử ra trận; chưa cử con nào thì lấy con đầu.
    mauCanh = (dan.find((r) => r.raTran && r.noAt) ?? dan[0]!).mau;

    const [daCo, daDau] = await Promise.all([
      db.rong.findMany({
        where: { userId, noAt: { not: null } },
        distinct: ['loai', 'mau'],
        take: DU_BO,
        select: { loai: true },
      }),
      db.miniGamePlay.count({
        where: { userId, game: 'RONGDAU', createdAt: { gte: dauNgayVN(now) } },
      }),
    ]);

    // Chỉ báo thứ CÓ VIỆC ĐỂ LÀM: trứng nở được ngay, và số trận còn lại hôm
    // nay. Một con số đếm suông thì chẳng nhắc được gì.
    const noDuoc = dan.filter((r) => !r.noAt && now >= r.apXongAt.getTime()).length;
    const conDau = Math.max(0, DAU_MOI_NGAY - daDau);
    nhan = {
      ...(noDuoc > 0 ? { '/rong/ap-trung': String(noDuoc) } : {}),
      ...(conDau > 0 ? { '/rong/dau-truong': String(conDau) } : {}),
      '/rong/so-suu-tam': `${daCo.length}/${DU_BO}`,
    };
  }

  return (
    <div style={bienCanhRong(mauCanh)} className="mx-auto max-w-2xl space-y-4">
      {/* Đường lùi đặt ở KHUNG chứ không ở từng trang: sáu lối đi mà chỉ trang
          chính có nút quay ra thì từ sổ sưu tầm muốn về khu giải trí phải chạm
          hai lần. */}
      <Link href="/giai-tri" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>
      {dan.length > 0 && <ThanhTab nhan={nhan} />}
      {children}
    </div>
  );
}
