import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, PenLine } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { QuizDanhSach } from '@/components/giaitri/QuizDanhSach';
import { QUIZ_MOI_TRANG, danhSachCauHoi, theLoaiTheoSlug } from '@/lib/quiz';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await theLoaiTheoSlug(slug);
  return { title: t ? `${t.name} — Trắc nghiệm` : 'Trắc nghiệm' };
}

/**
 * Một thể loại câu hỏi — tương ứng `quiz.php?act=cat&id=…` của bản gốc.
 *
 * Bản gốc để nút "Đăng câu hỏi" ngay đầu trang thể loại, vì đây là chỗ DUY
 * NHẤT đăng được câu hỏi: đăng câu là đăng vào thể loại đang mở.
 */
export default async function TheLoaiPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trang?: string }>;
}) {
  const { slug } = await params;
  const { trang: trangRaw } = await searchParams;
  const trang = Math.max(1, parseInt(trangRaw ?? '1', 10) || 1);

  const theLoai = await theLoaiTheoSlug(slug);
  if (!theLoai) notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const danh = await danhSachCauHoi({ categoryId: theLoai.id, trang });
  const soTrang = Math.ceil(danh.tong / QUIZ_MOI_TRANG);
  const goc = `/giai-tri/trac-nghiem/the-loai/${theLoai.slug}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri/trac-nghiem" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Trắc nghiệm
      </Link>

      <h1 className="text-xl font-black">{theLoai.name}</h1>
      {theLoai.note && <p className="mt-1 text-sm text-ink-500">{theLoai.note}</p>}

      {userId && (
        <Link href={`${goc}/dang`}
          className="btn-primary mt-3 inline-flex !py-2 text-sm">
          <PenLine size={15} /> Đăng câu hỏi
        </Link>
      )}

      <div className="mt-4 space-y-3">
        <QuizDanhSach items={danh.items} tong={danh.tong} trong="Chưa có câu hỏi nào." />
        <Pagination page={trang} totalPages={soTrang} basePath={goc} pageParam="trang" />
      </div>
    </div>
  );
}
