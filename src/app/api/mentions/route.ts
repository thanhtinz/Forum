import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const LIMIT = 6;

/**
 * Gợi ý thành viên khi gõ @ trong ô soạn.
 *
 * Chỉ trả về những gì đã công khai trên trang cá nhân (tên, ảnh, cấp độ) và
 * yêu cầu đăng nhập, để danh sách thành viên không bị quét từ bên ngoài.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] }, { status: 401 });

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 1 || q.length > 30) return NextResponse.json({ items: [] });

  const items = await db.user.findMany({
    where: {
      status: 'ACTIVE',
      username: { not: null, startsWith: q, mode: 'insensitive' },
    },
    select: { username: true, name: true, image: true, level: true },
    orderBy: [{ level: 'desc' }, { username: 'asc' }],
    take: LIMIT,
  });

  return NextResponse.json({ items });
}
