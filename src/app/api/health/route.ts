import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — dùng cho healthcheck của nền tảng triển khai (Railway…).
 *
 * Đụng thẳng vào CSDL chứ không chỉ trả "ok" suông: ứng dụng chạy được mà mất
 * kết nối Postgres thì mọi trang đều 500, healthcheck kiểu chỉ ping HTTP sẽ
 * không bao giờ bắt được ca đó.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
