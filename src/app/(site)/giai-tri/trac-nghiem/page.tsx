import Link from 'next/link';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { QuizCauHoi } from '@/components/giaitri/QuizCauHoi';
import { QuizRaCauHoi } from '@/components/giaitri/QuizRaCauHoi';
import {
  QUIZ_BAI_TOI_THIEU, QUIZ_COC_MAX, QUIZ_COC_MIN, QUIZ_MOI_TRANG, QUIZ_NHAN,
  QUIZ_TRANG_THAI_LABEL, cauHoiConTraLoi, cauHoiCuaToi, quyenRaCauHoi,
} from '@/lib/quiz';

export const metadata: Metadata = {
  title: 'Trắc nghiệm',
  description: 'Ra câu hỏi lấy cọc, trả lời đúng thì ăn cọc của người ra câu.',
};
export const dynamic = 'force-dynamic';

const BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

/**
 * Trắc nghiệm — dựng lại từ `quiz.php` của bộ mod JohnCMS Việt hoá cũ.
 *
 * Một trang gộp cả ba việc: trả lời câu người khác, ra câu của mình, xem câu
 * mình đã ra đang ở đâu. Tách ba trang thì mỗi trang chỉ có mấy dòng, mà người
 * chơi phải bấm qua bấm lại mới thấy hết chuyện của mình.
 */
export default async function TracNghiemPage({ searchParams }: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const { trang: trangRaw } = await searchParams;
  const trang = Math.max(1, parseInt(trangRaw ?? '1', 10) || 1);

  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl">
        <Dau />
        <section className="card p-5">
          <h1 className="mb-2 text-xl font-black">Trắc nghiệm</h1>
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/giai-tri/trac-nghiem" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để ra câu hỏi và trả lời.
          </p>
        </section>
        <LuatChoi />
      </div>
    );
  }

  const [me, danh, quyen, cuaToi] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { points: true } }),
    cauHoiConTraLoi(userId, trang),
    quyenRaCauHoi(userId),
    cauHoiCuaToi(userId),
  ]);
  const soTrang = Math.ceil(danh.tong / QUIZ_MOI_TRANG);

  return (
    <div className="mx-auto max-w-2xl">
      <Dau />

      {/* Không in số điểm ở đây: nó đã nằm sẵn trên thanh đầu trang. */}
      <h1 className="mb-4 text-xl font-black">Trắc nghiệm</h1>

      {/* ── Câu đang chờ mình trả lời ── */}
      <section className="space-y-3">
        <h2 className="zib-title">Câu hỏi đang mở ({danh.tong})</h2>
        {danh.items.length === 0 ? (
          <p className="card p-5 text-center text-sm text-ink-500">
            Hết câu để trả lời rồi. Ra một câu của bạn đi, hoặc quay lại sau.
          </p>
        ) : danh.items.map((c) => (
          <QuizCauHoi key={c.id} id={c.id} noiDung={c.content} phuongAn={c.options}
            coc={c.price} tacGia={c.author.name ?? c.author.username ?? 'Ẩn danh'} soLuot={c.soLuot} />
        ))}
        <Pagination page={trang} totalPages={soTrang} basePath="/giai-tri/trac-nghiem" pageParam="trang" />
      </section>

      {/* ── Ra câu hỏi mới ── */}
      <section className="card mt-6 p-5">
        <h2 className="zib-title mb-3">Ra câu hỏi</h2>
        {quyen.duoc ? <QuizRaCauHoi /> : (
          <p className="text-sm text-ink-500">{quyen.vuong}</p>
        )}
      </section>

      {/* ── Câu của mình ── */}
      {cuaToi.length > 0 && (
        <section className="card mt-4 p-5">
          <h2 className="zib-title mb-3">Câu hỏi của bạn</h2>
          <div className="space-y-3">
            {cuaToi.map((c) => (
              <div key={c.id} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-ink-800 dark:text-ink-100">
                    {c.content}
                  </p>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', BADGE[c.status])}>
                    {QUIZ_TRANG_THAI_LABEL[c.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  Đáp án {QUIZ_NHAN[c.correct]}: {c.options[c.correct]} · cọc {c.price} điểm ·{' '}
                  {c.soLuot} lượt trả lời, {c.soDung} đúng · {format(c.createdAt, 'HH:mm dd/MM/yyyy')}
                </p>
                {c.status === 'REJECTED' && c.reviewNote && (
                  <p className="mt-1 text-xs text-rose-600">Lý do từ chối: {c.reviewNote}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <LuatChoi />
    </div>
  );
}

function Dau() {
  return (
    <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
      <ArrowLeft size={15} /> Khu giải trí
    </Link>
  );
}

function LuatChoi() {
  return (
    <section className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
      <h2 className="zib-title mb-3">Luật chơi</h2>
      <ul className="list-inside list-disc space-y-1">
        <li>Ra câu hỏi phải đặt cọc {QUIZ_COC_MIN}–{QUIZ_COC_MAX} điểm, trừ ngay lúc gửi.</li>
        <li>Câu hỏi qua duyệt mới hiện ra; bị từ chối thì không hoàn cọc.</li>
        <li>Trả lời đúng ăn đúng số cọc ấy của người ra câu, sai thì mất đúng chừng ấy.</li>
        <li>Mỗi câu chỉ trả lời được một lần, và không tự trả lời câu của mình.</li>
        <li>Phải có ít nhất {QUIZ_BAI_TOI_THIEU} bài trên diễn đàn mới được ra câu hỏi.</li>
      </ul>
    </section>
  );
}
