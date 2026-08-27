import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canAccess, type AccessUser } from '@/lib/access';
import { dailyDownloadLimit, todayDownloadCount } from '@/lib/downloads';

/**
 * Cổng tải xuống có kiểm soát: xác thực → kiểm tra quyền truy cập bài viết →
 * áp hạn mức tải mỗi ngày → ghi nhật ký → chuyển hướng tới liên kết thật.
 * Không bao giờ lộ URL thật cho client cho tới khi qua được các bước trên.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const session = await auth();

  const item = await db.downloadItem.findUnique({
    where: { id: itemId },
    include: {
      post: {
        select: {
          id: true, slug: true, authorId: true, access: true,
          pricePoints: true,
          unlockLikes: true, unlockComments: true, likeCount: true, commentCount: true,
        },
      },
    },
  });
  if (!item) return NextResponse.json({ error: 'Không tìm thấy tệp.' }, { status: 404 });

  const back = (reason: string) => NextResponse.redirect(new URL(`/posts/${item.post.slug}?dl=${reason}`, _req.url));

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=/posts/${item.post.slug}`, _req.url));
  }
  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, level: true, status: true },
  });
  if (!user) return back('error');
  if (user.status === 'BANNED') return back('banned');

  // Kiểm tra quyền truy cập bài viết
  const accessUser: AccessUser = { id: user.id };
  const access = await canAccess(accessUser, item.post, { isAuthor: item.post.authorId === userId });
  if (!access.allowed) return back('locked');

  // Hạn mức tải mỗi ngày (tác giả tự tải bài của mình thì miễn đếm)
  const isOwner = item.post.authorId === userId;
  if (!isOwner) {
    const limit = dailyDownloadLimit(user);
    if (Number.isFinite(limit)) {
      const used = await todayDownloadCount(userId);
      if (used >= limit) return back('limit');
    }
  }

  // Ghi nhật ký rồi chuyển hướng tới liên kết thật (tuyệt đối hoặc tương đối)
  await db.downloadLog.create({ data: { userId, itemId: item.id } });
  let target: URL;
  try {
    target = new URL(item.url);
  } catch {
    target = new URL(item.url, _req.url); // liên kết nội bộ tương đối
  }
  return NextResponse.redirect(target, { status: 302 });
}
