import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getShouts, getShoutHere, markHere, SHOUT_SCOPE } from '@/lib/shout';

export const dynamic = 'force-dynamic';

/**
 * Nguồn dữ liệu cho phòng chat, được trang gọi lại vài giây một lần.
 *
 * Phòng chat cũ tự làm mới bằng thẻ <meta refresh> nạp lại cả trang; ở đây
 * chỉ nạp lại đúng phần dữ liệu. Mỗi lần gọi cũng là một lần điểm danh, nên
 * ai còn mở tab là còn nằm trong danh sách "đang trong phòng".
 */
export async function GET() {
  const session = await auth();
  const me = session?.user;
  if (!me?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await markHere(me.id, SHOUT_SCOPE);
  const [messages, here] = await Promise.all([getShouts(), getShoutHere()]);

  return NextResponse.json({
    messages,
    here,
    me: { id: me.id, role: (me as { role?: string }).role ?? 'USER' },
  });
}
