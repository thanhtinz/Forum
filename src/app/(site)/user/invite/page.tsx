import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Gift, Users, Coins } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtCount, tinhSoTrang } from '@/lib/utils';
import { INVITE_BONUS_POINTS, INVITE_DAILY_MAX } from '@/lib/invite';
import { InviteLink } from '@/components/user/InviteLink';
import { Pagination } from '@/components/Pagination';

export const metadata: Metadata = { title: 'Mời bạn bè' };
export const dynamic = 'force-dynamic';

/** Sinh mã giới thiệu nếu người dùng chưa có (tài khoản cũ). */
function fallbackCode(username: string | null, id: string): string {
  return (username ?? id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || id.slice(0, 8).toUpperCase();
}

/** Số người được mời hiện mỗi trang. */
const MOI_TRANG = 20;

export default async function InvitePage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/invite');
  const userId = session.user.id;

  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true, inviteCode: true } });
  let code = user?.inviteCode ?? null;
  if (!code) {
    code = fallbackCode(user?.username ?? null, userId);
    await db.user.update({ where: { id: userId }, data: { inviteCode: code } }).catch(() => {});
  }

  /*
   * Danh sách người được mời trước đây cắt ở 50 rồi thôi — mời nhiều hơn thế
   * là những người mời sớm nhất biến mất, mà đó lại đúng là những người đã
   * tính điểm xong.
   */
  const tongMoi = await db.user.count({ where: { invitedById: userId } });
  const soTrang = tinhSoTrang(tongMoi, MOI_TRANG);
  const trang = Math.min(Math.max(1, Number((await searchParams).page) || 1), soTrang);

  const invitees = await db.user.findMany({
    where: { invitedById: userId },
    orderBy: { createdAt: 'desc' },
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: { id: true, username: true, name: true, image: true, createdAt: true },
  });

  const [earnedAgg, daTra] = await Promise.all([
    db.pointsLog.aggregate({ where: { userId, reason: 'INVITE_BONUS' }, _sum: { amount: true } }),
    // Phần thưởng nay chỉ trả khi người được mời đăng bài đầu tiên, nên danh
    // sách phải nói rõ ai đã tính điểm, ai còn đang chờ — in "+20 điểm" cho tất
    // cả là hứa một thứ chưa chắc có.
    db.pointsLog.findMany({
      // Chỉ hỏi về ĐÚNG những người đang hiện trên trang này. Lấy bừa N dòng
      // đầu thì sang trang 2 ai cũng thành "đang chờ" dù đã trả thưởng từ lâu.
      where: { userId, reason: 'INVITE_BONUS', refId: { in: invitees.map((u) => u.id) } },
      take: MOI_TRANG,
      select: { refId: true },
    }),
  ]);
  const earned = earnedAgg._sum.amount ?? 0;
  const daThuong = new Set(daTra.map((r) => r.refId).filter((x): x is string => !!x));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      {/* Banner */}
      <section className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white">
          <div className="flex items-center gap-2 text-lg font-bold"><Gift size={22} /> Mời bạn — nhận điểm</div>
          <p className="mt-1 text-sm text-white/90">
            Người bạn mời đăng bài đầu tiên trên diễn đàn, bạn nhận <b>{INVITE_BONUS_POINTS} điểm</b> —
            tối đa {INVITE_DAILY_MAX} lượt mỗi ngày.
          </p>
        </div>
        <div className="p-5">
          <InviteLink code={code} />
        </div>
      </section>

      {/* Thống kê */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-950/40"><Users size={20} /></span>
          <div><div className="text-xl font-bold">{fmtCount(tongMoi)}</div><div className="text-xs text-ink-500">Đã mời</div></div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/40"><Coins size={20} /></span>
          <div><div className="text-xl font-bold">{fmtCount(earned)}</div><div className="text-xs text-ink-500">Điểm đã nhận</div></div>
        </div>
      </div>

      {/* Danh sách đã mời */}
      <section className="card mt-4 p-5">
        <h2 className="mb-3 font-bold">Bạn bè đã mời</h2>
        {invitees.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">Chưa có ai đăng ký qua lời mời của bạn. Hãy chia sẻ liên kết ở trên!</p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {invitees.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {u.image
                  ? <img src={u.image} alt="" className="size-9 rounded-full object-cover" />
                  : <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">{(u.name ?? u.username ?? 'U')[0]?.toUpperCase()}</span>}
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${u.username}`} className="truncate text-sm font-semibold hover:text-brand-600">{u.name ?? u.username}</Link>
                  <p className="text-xs text-ink-400">Tham gia {format(u.createdAt, 'dd/MM/yyyy')}</p>
                </div>
                {daThuong.has(u.id) ? (
                  <span className="shrink-0 text-xs font-medium text-amber-600">+{INVITE_BONUS_POINTS} điểm</span>
                ) : (
                  <span className="shrink-0 text-xs text-ink-400" title="Điểm được cộng khi người này đăng bài đầu tiên">
                    Chờ bài đầu tiên
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <Pagination page={trang} totalPages={soTrang} basePath="/user/invite" />
      </section>
    </div>
  );
}
