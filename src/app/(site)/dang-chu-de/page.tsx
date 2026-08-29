import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkForumPostAccess } from '@/lib/forum-post-access';

/**
 * Nút "Đăng chủ đề" trỏ về đây.
 *
 * Nút ấy nằm ở thanh đầu trang, thanh dưới điện thoại và bảng điều khiển — ba
 * chỗ không biết mình đang ở chuyên mục nào, mà trước đây cả ba đều trỏ về
 * `/forum`, tức là bị đá thẳng về trang chủ chứ chẳng tới ô soạn nào.
 *
 * Nên chỗ chọn chuyên mục dồn về một trang: hỏi xem người này đăng được ở đâu
 * rồi đưa thẳng tới đó. Chuyên mục xếp theo đúng thứ tự người ta nhìn thấy trên
 * trang chủ, nên "chuyên mục đầu tiên đăng được" là chuyên mục người ta cũng sẽ
 * tự chọn.
 */
export const dynamic = 'force-dynamic';

export default async function DangChuDePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/dang-chu-de');

  const forums = await db.forum.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    // Trần cho có trần: diễn đàn nào cũng chỉ vài chục chuyên mục, mà nếu có
    // nhiều hơn thế thì chuyên mục đăng được vẫn nằm trong mấy chục cái đầu.
    take: 200,
    select: { id: true, slug: true, postAccess: true, minLevel: true },
  });

  for (const f of forums) {
    if ((await checkForumPostAccess(userId, f)) === null) redirect(`/forum/${f.slug}/new`);
  }

  // Không đăng được ở đâu cả (cấp còn thấp, hoặc mọi chuyên mục đều khoá): về
  // trang chủ, ở đó có bảng chuyên mục kèm lý do từng khu.
  redirect('/');
}
