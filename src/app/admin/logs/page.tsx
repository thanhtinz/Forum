import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { ScrollText, Trash2 } from 'lucide-react';
import { requireSuperAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { cn, soDay, tinhSoTrang } from '@/lib/utils';
import { AUDIT_GROUPS, actionLabel, actionTone } from '@/lib/audit';
import { Pagination } from '@/components/Pagination';
import { PruneLogsButton } from '@/components/admin/PruneLogsButton';

export const metadata: Metadata = { title: 'Nhật ký quản trị' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 30;

const RANGES = [
  { key: '1', label: 'Hôm nay' },
  { key: '7', label: '7 ngày' },
  { key: '30', label: '30 ngày' },
  { key: 'ALL', label: 'Tất cả' },
] as const;

export default async function AdminLogsPage({ searchParams }: {
  searchParams: Promise<{ page?: string; group?: string; actor?: string; range?: string; q?: string }>;
}) {
  // Nhật ký lộ ra ai làm gì trên toàn site — chỉ ADMIN được đọc, mod thì không.
  await requireSuperAdmin();

  const { page: pageRaw, group: groupRaw, actor: actorRaw, range: rangeRaw, q: qRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const group = AUDIT_GROUPS.some((g) => g.value === groupRaw) ? groupRaw! : '';
  const actor = (actorRaw ?? '').trim();
  const range = RANGES.some((r) => r.key === rangeRaw) ? rangeRaw! : 'ALL';
  const q = (qRaw ?? '').trim();

  const since = range === 'ALL' ? null : new Date(Date.now() - parseInt(range, 10) * 86_400_000);

  const where = {
    // `action` có dạng `nhóm.việc` nên lọc theo tiền tố là đủ, không cần cột riêng.
    ...(group ? { action: { startsWith: `${group}.` } } : {}),
    ...(actor ? { actorId: actor } : {}),
    ...(since ? { createdAt: { gte: since } } : {}),
    ...(q ? { summary: { contains: q, mode: 'insensitive' as const } } : {}),
  };

  const [total, logs, actors] = await Promise.all([
    db.adminLog.count({ where }),
    db.adminLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, action: true, summary: true, targetType: true, targetId: true,
        meta: true, actorName: true, createdAt: true,
        actor: { select: { id: true, name: true, username: true, image: true } },
      },
    }),
    // Danh sách người từng thao tác, để đổ vào ô chọn "người thực hiện".
    db.user.findMany({
      where: { adminLogs: { some: {} } },
      orderBy: { username: 'asc' },
      select: { id: true, username: true, name: true },
      take: 100,
    }),
  ]);
  const totalPages = tinhSoTrang(total, PAGE_SIZE);

  const qs = new URLSearchParams();
  if (group) qs.set('group', group);
  if (actor) qs.set('actor', actor);
  if (range !== 'ALL') qs.set('range', range);
  if (q) qs.set('q', q);
  const basePath = qs.toString() ? `/admin/logs?${qs}` : '/admin/logs';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <ScrollText size={20} className="text-brand-500" /> Nhật ký quản trị
          </h1>
          <p className="text-sm text-ink-500">{soDay(total)} hành động được ghi lại</p>
        </div>
        <PruneLogsButton />
      </div>

      <form method="get" className="card flex flex-wrap items-end gap-2 p-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-600 dark:text-ink-300">Nhóm</span>
          <select name="group" defaultValue={group} className="input !w-auto min-w-40">
            <option value="">Mọi nhóm</option>
            {AUDIT_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-600 dark:text-ink-300">Người thực hiện</span>
          <select name="actor" defaultValue={actor} className="input !w-auto min-w-40">
            <option value="">Mọi người</option>
            {actors.map((a) => <option key={a.id} value={a.id}>{a.username ?? a.name ?? a.id}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-600 dark:text-ink-300">Khoảng thời gian</span>
          <select name="range" defaultValue={range} className="input !w-auto min-w-32">
            {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </label>
        <label className="block min-w-52 flex-1">
          <span className="mb-1 block text-sm font-medium text-ink-600 dark:text-ink-300">Tìm trong mô tả</span>
          <input name="q" defaultValue={q} className="input" placeholder="Ví dụ: tên bài, tên thành viên…" />
        </label>
        <button type="submit" className="btn-primary !px-3.5 !py-2 text-sm">Lọc</button>
        {(group || actor || q || range !== 'ALL') && (
          <Link href="/admin/logs" className="px-1 pb-2 text-sm text-ink-500 hover:text-brand-600">Bỏ lọc</Link>
        )}
      </form>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {logs.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-500">Chưa có hành động nào khớp bộ lọc.</div>
        )}
        {logs.map((l) => {
          const who = l.actor?.username ?? l.actorName ?? 'tài khoản đã xoá';
          const meta = l.meta && typeof l.meta === 'object' ? JSON.stringify(l.meta) : '';
          return (
            <div key={l.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 p-3">
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', actionTone(l.action))}>
                {actionLabel(l.action)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-800 dark:text-ink-100">{l.summary}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                  {l.actor ? (
                    <Link href={`/u/${l.actor.username ?? l.actor.id}`} target="_blank" className="font-medium hover:text-brand-600">
                      @{who}
                    </Link>
                  ) : (
                    <span className="font-medium italic">{who}</span>
                  )}
                  <span>·</span>
                  <span>{format(l.createdAt, 'dd/MM/yyyy HH:mm:ss')}</span>
                  {l.targetType && (<><span>·</span><span className="font-mono">{l.targetType}{l.targetId ? `/${l.targetId.slice(-6)}` : ''}</span></>)}
                </div>
                {meta && meta !== '{}' && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-ink-400 hover:text-brand-600">Chi tiết</summary>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-ink-50 p-2 text-[11px] text-ink-600 dark:bg-ink-900 dark:text-ink-300">{meta}</pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={basePath} />}

      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <Trash2 size={13} /> Nhật ký không tự xoá. Dùng nút dọn ở trên để bỏ các bản ghi quá cũ.
      </p>
    </div>
  );
}
