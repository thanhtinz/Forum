import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { xemBan } from '@/lib/bau-cua';

export const dynamic = 'force-dynamic';

/**
 * Tình hình bàn bầu cua, để trang tự cập nhật vài giây một lần.
 *
 * Đặt ở route handler chứ không phải server action: đây là việc ĐỌC lặp đi lặp
 * lại, mà server action thì mỗi lần gọi kéo theo cả một lượt dựng lại trang.
 *
 * Nó cũng chính là thứ khiến bàn tự xóc: `xemBan` gọi `chotSoPhienCu`, nên chỉ
 * cần có một người mở trang là phiên hết giờ được chốt sổ và trả thưởng — không
 * cần tiến trình chạy nền nào.
 */
export async function GET() {
  const session = await auth();
  const ban = await xemBan(session?.user?.id ?? null);
  return NextResponse.json(ban, { headers: { 'Cache-Control': 'no-store' } });
}
