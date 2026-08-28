import Link from 'next/link';
import type { Metadata } from 'next';
import { Users, Search, Coins } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Pagination } from '@/components/Pagination';
import { ClubCreateForm } from '@/components/club/ClubCreateForm';
import { ClubGrid } from '@/components/club/ClubGrid';
import { getClubs, getMyClubs, getClubConfig, CLUBS_OWNED_MAX } from '@/lib/club';
import { fmtCount } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Câu lạc bộ',
  description: 'Hội nhóm do thành viên tự lập, có bảng tin riêng.',
};
export const dynamic = 'force-dynamic';

export default async function ClubListPage({ searchParams }: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageRaw, q } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [list, cfg, mine, me] = await Promise.all([
    getClubs({ page, q }),
    getClubConfig(),
    userId ? getMyClubs(userId) : Promise.resolve([]),
    userId ? db.user.findUnique({ where: { id: userId }, select: { points: true } }) : Promise.resolve(null),
  ]);
  const owned = mine.filter((m) => m.role === 'OWNER').length;

  const base = q ? `/clb?q=${encodeURIComponent(q)}` : '/clb';

  return (
    <div className="container-nova py-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-ink-800 dark:text-ink-100">
            <Users size={24} className="text-brand-500" /> Câu lạc bộ
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {fmtCount(list.total)} câu lạc bộ do thành viên tự lập, mỗi nhóm một bảng tin riêng.
          </p>
        </div>

        <form action="/clb" className="flex items-center gap-2">
          <label className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" defaultValue={q ?? ''} placeholder="Tìm câu lạc bộ…"
              className="input !py-1.5 !pl-8 text-sm" />
          </label>
          <button type="submit" className="btn-ghost !py-1.5 text-sm">Tìm</button>
        </form>
      </header>

      {userId && (
        <ClubCreateForm
          cost={cfg.createCost}
          myPoints={me?.points ?? 0}
          canCreate={owned < CLUBS_OWNED_MAX}
          ownedMax={CLUBS_OWNED_MAX}
        />
      )}

      {mine.length > 0 && (
        <section className="mb-6">
          <h2 className="zib-title mb-3">Câu lạc bộ của bạn</h2>
          <ClubGrid clubs={mine.map((m) => m.club)} />
        </section>
      )}

      <section>
        <h2 className="zib-title mb-3">{q ? `Kết quả cho “${q}”` : 'Đông thành viên nhất'}</h2>
        {list.items.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-500">
            {q ? 'Không có câu lạc bộ nào khớp.' : 'Chưa có câu lạc bộ nào — lập nhóm đầu tiên đi!'}
          </div>
        ) : (
          <ClubGrid clubs={list.items} />
        )}
        <Pagination page={list.page} totalPages={list.totalPages} basePath={base} />
      </section>

      {!userId && (
        <p className="mt-6 text-center text-sm text-ink-500">
          <Link href="/login?callbackUrl=/clb" className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
          {' '}để lập câu lạc bộ
          {cfg.createCost > 0 && <> (tốn <Coins size={13} className="inline text-amber-500" /> {fmtCount(cfg.createCost)} điểm)</>}.
        </p>
      )}
    </div>
  );
}
