import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { QuizDanhSach } from '@/components/giaitri/QuizDanhSach';
import { QUIZ_MOI_TRANG, cauHoiCuaToi } from '@/lib/quiz';
import { tinhSoTrang } from '@/lib/utils';

export const metadata: Metadata = { title: 'Câu hỏi của bạn' };
export const dynamic = 'force-dynamic';

/**
 * "Câu hỏi của bạn" — tương ứng `quiz.php?act=me`.
 *
 * Bản gốc chỉ liệt kê câu ĐÃ DUYỆT, nên người ta đăng xong là câu biến mất
 * không biết đi đâu. Ở đây liệt kê CẢ BA trạng thái kèm nhãn duyệt và lý do
 * từ chối — cùng mục đích ấy nhưng trả lời được câu hỏi thật sự của người
 * đăng: "câu của tôi đâu rồi?".
 */
export default async function CauHoiCuaToiPage({ searchParams }: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const { trang: trangRaw } = await searchParams;
  const trang = Math.max(1, parseInt(trangRaw ?? '1', 10) || 1);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/giai-tri/trac-nghiem/cua-toi');

  const danh = await cauHoiCuaToi(userId, trang);
  const soTrang = tinhSoTrang(danh.tong, QUIZ_MOI_TRANG);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri/trac-nghiem" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Trắc nghiệm
      </Link>

      <h1 className="mb-4 text-xl font-black">Câu hỏi của bạn</h1>

      <div className="space-y-3">
        <QuizDanhSach items={danh.items} tong={danh.tong} hienTrangThai
          trong="Bạn chưa đăng câu hỏi nào. Chọn một thể loại rồi đăng câu mới nhé." />
        <Pagination page={trang} totalPages={soTrang}
          basePath="/giai-tri/trac-nghiem/cua-toi" pageParam="trang" />
      </div>
    </div>
  );
}
