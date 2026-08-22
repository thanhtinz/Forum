import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/** Danh sách bộ sticker đang bật, dùng cho bảng chọn ở khung soạn. */
export async function GET() {
  const packs = await db.stickerPack.findMany({
    where: { active: true, stickers: { some: {} } },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      stickers: {
        orderBy: { order: 'asc' },
        select: { id: true, name: true, url: true },
      },
    },
  });
  return NextResponse.json({ packs });
}
