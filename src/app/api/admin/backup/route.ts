import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { createBackup, backupTokenValid } from '@/lib/backup';
import { logAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Tải một bản sao lưu toàn bộ dữ liệu (.json.gz).
 *
 * Hai lối vào:
 * - Quản trị viên đang đăng nhập bấm nút trong trang quản trị.
 * - Dịch vụ hẹn giờ bên ngoài gọi kèm `Authorization: Bearer <BACKUP_TOKEN>`
 *   (hoặc header `x-backup-token`) để chạy sao lưu định kỳ.
 */
export async function GET(req: NextRequest) {
  const header = req.headers.get('authorization') ?? '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
  const token = bearer ?? req.headers.get('x-backup-token');

  let by: string | null = null;
  let actor: { id: string; name?: string | null } | null = null;

  if (backupTokenValid(token)) {
    by = 'cron';
  } else {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    // Chỉ ADMIN — bản sao lưu chứa toàn bộ dữ liệu người dùng, mod không được tải.
    if (session?.user?.id && role === 'ADMIN') {
      by = 'admin';
      actor = { id: session.user.id, name: session.user.name };
    }
  }

  if (!by) {
    // Token đặt trên URL sẽ nằm lại trong log máy chủ, nên chỉ nhận qua header.
    return NextResponse.json({ error: 'Không có quyền tải bản sao lưu.' }, { status: 403 });
  }

  let result;
  try {
    result = await createBackup(by);
  } catch {
    return NextResponse.json({ error: 'Không tạo được bản sao lưu.' }, { status: 500 });
  }

  if (actor) {
    await logAdmin({
      actor, action: 'backup.export', targetType: 'backup', targetId: null,
      summary: `Tải bản sao lưu ${result.filename} — ${result.total} bản ghi`,
      meta: { size: result.body.byteLength, total: result.total },
    });
  }

  return new NextResponse(new Uint8Array(result.body), {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Length': String(result.body.byteLength),
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
      'X-Backup-Records': String(result.total),
    },
  });
}
