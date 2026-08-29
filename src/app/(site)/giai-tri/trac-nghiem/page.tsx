import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, FolderOpen, ShieldCheck, User } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { QuizDanhSach } from '@/components/giaitri/QuizDanhSach';
import { GopTrenDienThoai } from '@/components/GopTrenDienThoai';
import {
  QUIZ_BAI_TOI_THIEU, QUIZ_COC_MAX, QUIZ_COC_MIN, QUIZ_MOI_TRANG,
  danhSachCauHoi, danhSachTheLoai,
} from '@/lib/quiz';

export const metadata: Metadata = {
  title: 'Trắc nghiệm',
  description: 'Ra câu hỏi lấy cọc, trả lời đúng thì ăn cọc của người ra câu.',
};
export const dynamic = 'force-dynamic';

/**
 * Trắc nghiệm — dựng lại từ `quiz.php` của bộ mod JohnCMS Việt hoá cũ.
 *
 * Trang chủ của trò giữ đúng bố cục bản gốc: câu hỏi MỚI NHẤT ở trên, danh
 * sách THỂ LOẠI kèm số câu ở dưới. Việc đăng câu hỏi không nằm ở đây mà nằm
 * trong từng thể loại, vì bản gốc coi "đăng câu" là "đăng vào một thể loại".
 */
export default async function TracNghiemPage({ searchParams }: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const { trang: trangRaw } = await searchParams;
  const trang = Math.max(1, parseInt(trangRaw ?? '1', 10) || 1);

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const dieuHanh = role === 'ADMIN' || role === 'MODERATOR';

  const [danh, theLoai] = await Promise.all([
    danhSachCauHoi({ trang }),
    danhSachTheLoai(),
  ]);
  const soTrang = Math.ceil(danh.tong / QUIZ_MOI_TRANG);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>

      {/* Không in số điểm ở đây: nó đã nằm sẵn trên thanh đầu trang. */}
      <h1 className="mb-3 text-xl font-black">Trắc nghiệm</h1>

      {!userId && (
        <p className="card mb-4 p-4 text-sm text-ink-500">
          <Link href="/login?callbackUrl=/giai-tri/trac-nghiem" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>{' '}để ra câu hỏi và trả lời.
        </p>
      )}

      {userId && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/giai-tri/trac-nghiem/cua-toi"
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300">
            <User size={15} /> Câu hỏi của bạn
          </Link>
          {dieuHanh && (
            <Link href="/admin/quiz"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950">
              <ShieldCheck size={15} /> Quản trị trắc nghiệm
            </Link>
          )}
        </div>
      )}

      {/* ── Câu hỏi mới nhất ── */}
      <section className="space-y-3">
        <h2 className="zib-title">Câu hỏi mới nhất</h2>
        <QuizDanhSach items={danh.items} tong={danh.tong}
          trong="Hiện tại chưa có câu hỏi nào." />
        <Pagination page={trang} totalPages={soTrang} basePath="/giai-tri/trac-nghiem" pageParam="trang" />
      </section>

      {/* ── Thể loại ── */}
      <section className="mt-6 space-y-3">
        <h2 className="zib-title">Thể loại</h2>
        {theLoai.length === 0 ? (
          <p className="card p-6 text-center text-sm text-ink-500">
            Chưa có thể loại nào được tạo.
          </p>
        ) : (
          <div className="card overflow-hidden">
            <ul>
              {theLoai.map((t) => (
                <li key={t.id} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
                  <Link href={`/giai-tri/trac-nghiem/the-loai/${t.slug}`}
                    className="flex items-start gap-2 px-3 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-800/40">
                    <FolderOpen size={16} className="mt-0.5 shrink-0 text-amber-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink-800 dark:text-ink-100">
                        {t.name} <span className="font-normal text-ink-400">({t.soCau})</span>
                      </span>
                      {t.note && <span className="block text-xs text-ink-500">{t.note}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="border-t border-ink-100 bg-ink-50/60 px-3 py-2 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:bg-ink-800/40">
              Tổng số thể loại: {theLoai.length}
            </p>
          </div>
        )}
      </section>

      <GopTrenDienThoai tieuDe="Luật chơi" className="card mt-6 p-5 text-sm text-ink-600 dark:text-ink-300">
        <ul className="list-inside list-disc space-y-1">
          <li>Ra câu hỏi phải đặt cọc {QUIZ_COC_MIN}–{QUIZ_COC_MAX} điểm, trừ ngay lúc gửi.</li>
          <li>Câu hỏi qua duyệt mới hiện ra; bị từ chối thì không hoàn cọc.</li>
          <li>Trả lời đúng ăn đúng số cọc ấy của người ra câu, sai thì mất đúng chừng ấy.</li>
          <li>Mỗi câu chỉ trả lời được một lần, và không tự trả lời câu của mình.</li>
          <li>Trả lời xong mới được bình luận; cấm gợi ý đáp án.</li>
          <li>Phải có ít nhất {QUIZ_BAI_TOI_THIEU} bài trên diễn đàn mới được ra câu hỏi.</li>
        </ul>
      </GopTrenDienThoai>
    </div>
  );
}
