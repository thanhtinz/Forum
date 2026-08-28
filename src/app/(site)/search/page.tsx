import Link from 'next/link';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { Search as SearchIcon, MessagesSquare, Users, SlidersHorizontal } from 'lucide-react';
import { db } from '@/lib/db';
import { cn, fmtCount, plainText, truncate } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { TableHead } from '@/components/forum/TableHead';
import { ThreadRow, type ThreadRowData } from '@/components/forum/ThreadRow';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { getLevelLooks } from '@/lib/level';
import { LevelBadge } from '@/components/LevelBadge';
import { authorChipSelect, toAuthorChip } from '@/lib/shop';
import { threadExcerpt } from '@/lib/bbcode';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import {
  buildThreadSearch, isSearchSort, isSearchWhen, SEARCH_SORTS, SEARCH_WHEN,
} from '@/lib/thread-search';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

export const metadata: Metadata = { title: 'Tìm kiếm' };

const TABS = [
  { key: 'threads', label: 'Chủ đề', icon: MessagesSquare },
  { key: 'users', label: 'Thành viên', icon: Users },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<{
    q?: string; page?: string; tab?: string;
    box?: string; tacgia?: string; khi?: string; sap?: string; giai?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const tab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : 'threads';
  const like = { contains: q, mode: 'insensitive' as const };

  const box = (sp.box ?? '').trim();
  const tacGia = (sp.tacgia ?? '').trim();
  const khi = isSearchWhen(sp.khi) ? sp.khi : 'all';
  const sap = isSearchSort(sp.sap) ? sp.sap : 'recent';
  const chiGiai = sp.giai === '1';

  const search = buildThreadSearch({
    q, forum: box, author: tacGia, when: khi, sort: sap, solved: chiGiai,
  });

  const [levelLooks, forums] = await Promise.all([
    getLevelLooks(),
    db.forum.findMany({
      take: CONFIG_LIST_CAP,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { slug: true, name: true },
    }),
  ]);

  // Đếm cho cả hai tab để hiện số lượng ngay trên nhãn
  const [threadTotal, userTotal] = q
    ? await Promise.all([
        db.thread.count({ where: search.where }),
        db.user.count({ where: { status: 'ACTIVE', OR: [{ username: like }, { name: like }] } }),
      ])
    : [0, 0];

  const total = tab === 'threads' ? threadTotal : userTotal;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const skip = (page - 1) * PAGE_SIZE;

  const threads: ThreadRowData[] = q && tab === 'threads'
    ? (await db.thread.findMany({
        where: search.where,
        orderBy: search.orderBy,
        skip, take: PAGE_SIZE,
        select: {
          id: true, title: true, content: true, createdAt: true, lastReplyAt: true,
          pinned: true, locked: true, solvedReplyId: true, bountyPoints: true,
          viewCount: true, replyCount: true,
          author: { select: authorChipSelect },
          forum: { select: { slug: true, name: true } },
        },
      })).map((t) => ({
        id: t.id, title: t.title, createdAt: t.createdAt, lastReplyAt: t.lastReplyAt,
        pinned: t.pinned, locked: t.locked, solved: !!t.solvedReplyId, bountyPoints: t.bountyPoints,
        viewCount: t.viewCount, replyCount: t.replyCount, author: toAuthorChip(t.author), forum: t.forum,
        excerpt: threadExcerpt(t.content),
      }))
    : [];


  const users = q && tab === 'users'
    ? await db.user.findMany({
        where: { status: 'ACTIVE', OR: [{ username: like }, { name: like }] },
        orderBy: [{ exp: 'desc' }],
        skip, take: PAGE_SIZE,
        select: { username: true, name: true, image: true, level: true, bio: true, _count: { select: { threads: true, replies: true } } },
      })
    : [];

  /** Giữ nguyên mọi lựa chọn đang bật khi đổi một thứ. */
  const hrefWith = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (tab !== 'threads') p.set('tab', tab);
    if (box) p.set('box', box);
    if (tacGia) p.set('tacgia', tacGia);
    if (khi !== 'all') p.set('khi', khi);
    if (sap !== 'recent') p.set('sap', sap);
    if (chiGiai) p.set('giai', '1');
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    p.delete('page');
    const s2 = p.toString();
    return s2 ? `/search?${s2}` : '/search';
  };
  const hrefFor = (t: TabKey) => hrefWith({ tab: t === 'threads' ? null : t });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <header className="card p-4">
          <form action="/search" className="relative">
            {tab !== 'threads' && <input type="hidden" name="tab" value={tab} />}
            {box && <input type="hidden" name="box" value={box} />}
            {tacGia && <input type="hidden" name="tacgia" value={tacGia} />}
            {khi !== 'all' && <input type="hidden" name="khi" value={khi} />}
            {sap !== 'recent' && <input type="hidden" name="sap" value={sap} />}
            {chiGiai && <input type="hidden" name="giai" value="1" />}
            <SearchIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" defaultValue={q} placeholder="Tìm chủ đề, thành viên…" className="input pl-10" autoFocus />
          </form>

          {/* Bảng lọc: mở sẵn khi đang có bộ lọc bật, để người dùng thấy ngay
              vì sao kết quả ít hơn họ tưởng. */}
          {q && tab === 'threads' && (
            <details open={search.filtered} className="group mt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600">
                <SlidersHorizontal size={15} />
                Lọc nâng cao
                {search.filtered && (
                  <span className="chip gap-1 bg-brand-100 text-xs text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
                    đang lọc
                  </span>
                )}
              </summary>

              <form action="/search" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input type="hidden" name="q" value={q} />
                <label className="block">
                  <span className="label">Khu vực</span>
                  <select name="box" defaultValue={box} className="input !py-1.5 text-sm">
                    <option value="">Khắp diễn đàn</option>
                    {forums.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Người lập chủ đề</span>
                  <input name="tacgia" defaultValue={tacGia} placeholder="tên đăng nhập"
                    className="input !py-1.5 text-sm" />
                </label>
                <label className="block">
                  <span className="label">Thời gian lập</span>
                  <select name="khi" defaultValue={khi} className="input !py-1.5 text-sm">
                    {SEARCH_WHEN.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Sắp theo</span>
                  <select name="sap" defaultValue={sap} className="input !py-1.5 text-sm">
                    {SEARCH_SORTS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </select>
                </label>

                <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
                  <label className="flex items-center gap-1.5 text-sm text-ink-600 dark:text-ink-300">
                    <input type="checkbox" name="giai" value="1" defaultChecked={chiGiai} className="size-4 rounded" />
                    Chỉ chủ đề đã có lời giải
                  </label>
                  <button type="submit" className="btn-primary !py-1.5 text-sm">Lọc</button>
                  {search.filtered && (
                    <Link href={`/search?q=${encodeURIComponent(q)}`} className="text-sm text-ink-500 hover:text-brand-600">
                      Bỏ lọc
                    </Link>
                  )}
                </div>
              </form>
            </details>
          )}

          {q && (
            <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto rounded-full bg-ink-100 p-1 dark:bg-ink-800">
              {TABS.map((t) => {
                const count = t.key === 'threads' ? threadTotal : userTotal;
                return (
                  <Link key={t.key} href={hrefFor(t.key)}
                    className={cn('flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                      tab === t.key ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700' : 'text-ink-500 hover:text-brand-600')}>
                    <t.icon size={15} /> {t.label}
                    <span className={cn('text-xs', tab === t.key ? 'text-brand-400' : 'text-ink-400')}>{fmtCount(count)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </header>

        {!q ? (
          <div className="card p-12 text-center text-ink-400">Nhập từ khoá để tìm chủ đề hoặc thành viên.</div>
        ) : tab === 'threads' ? (
          <section data-ket-qua className="card overflow-hidden">
            <TableHead title={`Chủ đề · ${fmtCount(threadTotal)} kết quả`} icon={<MessagesSquare size={15} className="text-brand-500" />}
              cols={{ last: 'Hoạt động', a: 'Trả lời', b: 'Lượt xem' }} />
            {threads.length === 0 ? (
              <div className="p-10 text-center text-sm text-ink-400">
                <p>Không tìm thấy chủ đề nào cho “{q}”.</p>
                {/* Rỗng vì từ khoá hay vì bộ lọc? Không nói rõ thì người tìm
                    tưởng diễn đàn không có gì, trong khi chỉ cần bỏ lọc. */}
                {search.filtered && (
                  <p className="mt-1">
                    Bộ lọc đang bật —{' '}
                    <Link href={`/search?q=${encodeURIComponent(q)}`} className="font-semibold text-brand-600 hover:underline">
                      bỏ lọc để tìm khắp diễn đàn
                    </Link>.
                  </p>
                )}
              </div>
            ) : (
              <div className="retro-stripe divide-y divide-ink-100 dark:divide-ink-800">
                {threads.map((t) => <ThreadRow key={t.id} thread={t} showForum />)}
              </div>
            )}
          </section>
        ) : (
          <section data-ket-qua className="card overflow-hidden">
            <TableHead title={`Thành viên · ${fmtCount(userTotal)} kết quả`} icon={<Users size={15} className="text-emerald-500" />} />
            {users.length === 0 ? (
              <p className="p-10 text-center text-sm text-ink-400">Không tìm thấy thành viên nào cho “{q}”.</p>
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {users.map((u) => (
                  <Link key={u.username} href={`/u/${u.username ?? ''}`}
                    className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-ink-50 sm:px-4 dark:hover:bg-ink-800/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {u.image
                      ? <img src={u.image} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                      : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{(u.name ?? u.username ?? 'U')[0]?.toUpperCase()}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                        <span className="truncate">{u.name ?? u.username}</span>
                        <LevelBadge level={u.level}
                          color={levelLooks.get(u.level)?.color} name={levelLooks.get(u.level)?.name} />
                      </p>
                      <p className="truncate text-xs text-ink-400">{u.bio || `@${u.username}`}</p>
                    </div>
                    <span className="hidden shrink-0 text-xs text-ink-400 sm:block">
                      {fmtCount(u._count.threads)} chủ đề · {fmtCount(u._count.replies)} trả lời
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {q && totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={hrefFor(tab)} />}
      </div>

      <div className="hidden lg:block lg:sticky lg:top-[72px] lg:self-start"><ForumSidebar /></div>
    </div>
  );
}
