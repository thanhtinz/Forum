import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { cn, tinhSoTrang } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { FolderCog } from 'lucide-react';
import { QUIZ_NHAN, QUIZ_TRANG_THAI_LABEL } from '@/lib/quiz-const';
import { QuizRowActions } from './QuizRowActions';

export const metadata: Metadata = { title: 'Câu hỏi trắc nghiệm' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

const STATUSES = [
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đang hiện' },
  { key: 'REJECTED', label: 'Bị từ chối' },
  { key: 'ALL', label: 'Tất cả' },
] as const;

const BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

/**
 * Hàng chờ duyệt câu hỏi trắc nghiệm.
 *
 * Ở đây được thấy đáp án đúng — mà phải thấy, không thì lấy gì mà duyệt.
 * Trang này chỉ quản trị/điều hành mở được (`requireAdmin`).
 */
export default async function AdminQuizPage({ searchParams }: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdmin();
  const { page: pageRaw, status: statusRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const status = STATUSES.some((s) => s.key === statusRaw) ? statusRaw! : 'PENDING';
  const where = status === 'ALL' ? {} : { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' };

  const [total, items] = await Promise.all([
    db.quizQuestion.count({ where }),
    db.quizQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, content: true, options: true, correct: true, explain: true,
        price: true, status: true, reviewNote: true, createdAt: true,
        author: { select: { username: true, name: true } },
        category: { select: { slug: true, name: true } },
        _count: { select: { answers: true } },
      },
    }),
  ]);
  const totalPages = tinhSoTrang(total, PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Câu hỏi trắc nghiệm</h1>
        <p className="text-sm text-ink-500">
          {STATUSES.find((s) => s.key === status)?.label} · {total} câu
        </p>
      </div>

      <Link href="/admin/quiz/the-loai"
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300">
        <FolderCog size={14} /> Thể loại trắc nghiệm
      </Link>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Link key={s.key} href={`/admin/quiz?status=${s.key}`}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              s.key === status
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-ink-200 text-ink-600 hover:border-brand-400 dark:border-ink-700 dark:text-ink-300',
            )}>
            {s.label}
          </Link>
        ))}
      </div>

      <div className="space-y-2.5">
        {items.length === 0 && (
          <div className="card p-8 text-center text-sm text-ink-500">Không có câu hỏi nào.</div>
        )}
        {items.map((q) => (
          <div key={q.id} className="card space-y-2.5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 flex-1 font-semibold text-ink-800 dark:text-ink-100">{q.content}</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  {q.price} điểm
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', BADGE[q.status])}>
                  {QUIZ_TRANG_THAI_LABEL[q.status]}
                </span>
              </div>
            </div>

            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {q.options.map((o, i) => (
                <li key={i} className={cn(
                  'rounded-lg px-2 py-1',
                  i === q.correct
                    ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-ink-50 text-ink-600 dark:bg-ink-800/50 dark:text-ink-300',
                )}>
                  <b className="mr-1 text-ink-400">{QUIZ_NHAN[i]}.</b>{o}
                </li>
              ))}
            </ul>

            {q.explain && <p className="text-sm text-ink-500">Giải thích: {q.explain}</p>}
            {q.reviewNote && <p className="text-sm text-rose-600">Lý do từ chối: {q.reviewNote}</p>}

            <p className="text-xs text-ink-400">
              Bởi {q.author.name ?? q.author.username ?? 'Ẩn danh'} ·{' '}
              {q.category
                ? <Link href={`/giai-tri/trac-nghiem/the-loai/${q.category.slug}`} className="hover:text-brand-600">{q.category.name}</Link>
                : <span className="text-rose-500">chưa có thể loại</span>}
              {' · '}{q._count.answers} lượt trả lời · {format(q.createdAt, 'HH:mm dd/MM/yyyy')}
              {q.status === 'APPROVED' && (
                <>
                  {' · '}
                  <Link href={`/giai-tri/trac-nghiem/cau-hoi/${q.id}`} className="font-semibold hover:text-brand-600">
                    Xem ngoài trang chơi
                  </Link>
                </>
              )}
            </p>

            {q.status === 'PENDING' && <QuizRowActions id={q.id} />}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} basePath={`/admin/quiz?status=${status}`} />
      )}
    </div>
  );
}
