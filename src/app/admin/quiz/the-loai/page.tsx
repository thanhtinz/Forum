import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { QUIZ_THE_LOAI_TOI_DA } from '@/lib/quiz-const';
import { TheLoaiDong, TheLoaiMoi } from './TheLoaiPanel';

export const metadata: Metadata = { title: 'Thể loại trắc nghiệm' };
export const dynamic = 'force-dynamic';

/**
 * Lập và sửa thể loại câu hỏi — tương ứng `quiz.php?act=add` (không kèm id)
 * của bản gốc, chỗ Admin đặt tên và mô tả cho từng thể loại.
 *
 * Số câu bày ở đây đếm CẢ câu chưa duyệt, khác con số ngoài trang chơi: người
 * quản trị cần biết thể loại nào đang có việc, chứ không phải nó trông ra sao
 * với người chơi.
 */
export default async function AdminQuizTheLoaiPage() {
  await requireAdmin();

  const rows = await db.quizCategory.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    take: QUIZ_THE_LOAI_TOI_DA,
    select: {
      id: true, slug: true, name: true, note: true, order: true,
      _count: { select: { questions: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/quiz" className="mb-2 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
          <ArrowLeft size={15} /> Câu hỏi trắc nghiệm
        </Link>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Thể loại trắc nghiệm</h1>
        <p className="text-sm text-ink-500">
          {rows.length} thể loại · người chơi đăng câu hỏi VÀO thể loại, nên chưa có thể loại là chưa
          ai đăng được câu nào.
        </p>
      </div>

      <TheLoaiMoi />

      <div className="space-y-2.5">
        {rows.map((t) => (
          <TheLoaiDong key={t.id}
            t={{ id: t.id, slug: t.slug, name: t.name, note: t.note, order: t.order, soCau: t._count.questions }} />
        ))}
      </div>
    </div>
  );
}
