import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { QuizRaCauHoi } from '@/components/giaitri/QuizRaCauHoi';
import { quyenRaCauHoi, theLoaiTheoSlug } from '@/lib/quiz';

export const metadata: Metadata = { title: 'Đăng câu hỏi trắc nghiệm' };
export const dynamic = 'force-dynamic';

/**
 * Đăng câu hỏi vào một thể loại — tương ứng `quiz.php?act=add&id=…`.
 *
 * Trang riêng chứ không nhét biểu mẫu vào cuối trang thể loại: biểu mẫu này
 * dài (bốn phương án, đáp án, lời giải, cọc), để lẫn vào danh sách thì cả
 * trang thể loại biến thành trang nhập liệu.
 */
export default async function DangCauHoiPage({ params }: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theLoai = await theLoaiTheoSlug(slug);
  if (!theLoai) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect(`/login?callbackUrl=/giai-tri/trac-nghiem/the-loai/${slug}/dang`);

  const quyen = await quyenRaCauHoi(userId);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/giai-tri/trac-nghiem/the-loai/${theLoai.slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> {theLoai.name}
      </Link>

      <h1 className="mb-4 text-xl font-black">Đăng câu hỏi</h1>

      <section className="card p-5">
        {quyen.duoc ? (
          <QuizRaCauHoi categoryId={theLoai.id} tenTheLoai={theLoai.name} slugTheLoai={theLoai.slug} />
        ) : (
          <p className="text-sm text-ink-500">{quyen.vuong}</p>
        )}
      </section>
    </div>
  );
}
