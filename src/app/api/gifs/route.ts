import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getGifConfig, searchGifs } from '@/lib/gif';

/**
 * Tìm GIF cho khung soạn trả lời. Khoá API nằm ở server, client chỉ nhận
 * danh sách kết quả nên khoá không bao giờ lộ ra trình duyệt.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] }, { status: 401 });

  const cfg = await getGifConfig();
  if (!cfg.enabled) {
    return NextResponse.json({ items: [], disabled: true });
  }

  const q = req.nextUrl.searchParams.get('q') ?? '';
  const items = await searchGifs(cfg, q.slice(0, 100));
  return NextResponse.json({ items });
}
