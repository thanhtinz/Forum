import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/** Thư mục lưu ảnh người dùng tải lên (phục vụ tĩnh qua /uploads/...). */
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Nhận một ảnh từ người dùng đã đăng nhập và trả về đường dẫn công khai.
 * Kiểu tệp được xác định từ nội dung thật (magic bytes), không tin `type`
 * do trình duyệt khai báo.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 });


  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Thiếu tệp ảnh.' }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: 'Tệp rỗng.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Ảnh tối đa 5MB.' }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = ALLOWED[sniffMime(buf) ?? ''];
  if (!ext) return NextResponse.json({ error: 'Chỉ nhận ảnh JPG, PNG, GIF hoặc WebP.' }, { status: 415 });

  const name = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), buf);

  return NextResponse.json({ url: `/uploads/${name}` });
}

/** Đoán kiểu ảnh từ vài byte đầu — an toàn hơn tin vào header của client. */
function sniffMime(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
