import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { DEFAULT_CONFIG, parseConfig } from '@/lib/emulator-config';

export const dynamic = 'force-dynamic';

/**
 * Cấu hình emulator riêng cho từng game của người dùng đã đăng nhập.
 * Khách chưa đăng nhập giữ cấu hình trong localStorage nên GET trả về mặc định.
 *
 * GET  /api/games/{id|slug}/config
 * PUT  /api/games/{id|slug}/config   { …EmulatorConfig }
 */
async function findGame(idOrSlug: string) {
  return db.game.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: 'PUBLISHED' },
    select: { id: true },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const game = await findGame(id);
  if (!game) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  if (!session?.user?.id) return NextResponse.json({ config: DEFAULT_CONFIG, stored: false });

  const row = await db.userGameConfig.findUnique({
    where: { userId_gameId: { userId: session.user.id, gameId: game.id } },
    select: { config: true },
  });
  return NextResponse.json({ config: parseConfig(row?.config), stored: !!row });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const game = await findGame(id);
  if (!game) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json().catch(() => null);
  // parseConfig đã trám mọi trường về giá trị hợp lệ nên không cần validate thêm.
  const config = parseConfig(body);

  // Prisma nhận Json thuần, nên đưa qua một object phẳng.
  const json = { ...config };
  await db.userGameConfig.upsert({
    where: { userId_gameId: { userId: session.user.id, gameId: game.id } },
    update: { config: json },
    create: { userId: session.user.id, gameId: game.id, config: json },
  });
  return NextResponse.json({ config });
}
