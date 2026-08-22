import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { putFile, newObjectName, sniffImage } from '@/lib/storage';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(['jpg', 'png', 'gif', 'webp']);

/**
 * Nhận một ảnh từ người dùng đã đăng nhập và trả về đường dẫn công khai.
 * Kiểu tệp xác định từ nội dung thật (magic bytes), không tin `type` do
 * trình duyệt khai báo. Tệp được đẩy lên Cloudflare R2 nếu đã cấu hình.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Thiếu tệp ảnh.' }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: 'Tệp rỗng.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Ảnh tối đa 5MB.' }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind || !ALLOWED.has(kind.ext)) {
    return NextResponse.json({ error: 'Chỉ nhận ảnh JPG, PNG, GIF hoặc WebP.' }, { status: 415 });
  }

  const stored = await putFile(buf, newObjectName(kind.ext), kind.mime);
  return NextResponse.json({ url: stored.url });
}
