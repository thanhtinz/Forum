import { NextResponse, type NextRequest } from 'next/server';
import { unzipSync } from 'fflate';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { putFile, newObjectName, sniffImage } from '@/lib/storage';

const MAX_ZIP = 20 * 1024 * 1024;     // 20MB cho cả gói
const MAX_ITEM = 1 * 1024 * 1024;     // 1MB mỗi sticker
const MAX_ITEMS = 60;                 // tối đa 60 sticker / pack

function toSlug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'pack';
}

/** SVG có thể chứa mã kịch bản — từ chối tệp đáng ngờ thay vì cố lọc. */
function svgLooksUnsafe(buf: Buffer): boolean {
  const s = buf.toString('utf8').toLowerCase();
  return s.includes('<script') || s.includes('javascript:') || /\son\w+\s*=/.test(s);
}

/**
 * Nhận một tệp .zip chứa ảnh sticker, giải nén và tạo pack mới.
 * Tên sticker lấy từ tên tệp trong gói.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ quản trị viên mới thực hiện được.' }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const rawName = String(form?.get('name') ?? '').trim();

  if (!(file instanceof File)) return NextResponse.json({ error: 'Thiếu tệp .zip.' }, { status: 400 });
  if (!rawName) return NextResponse.json({ error: 'Hãy đặt tên cho bộ sticker.' }, { status: 400 });
  if (file.size > MAX_ZIP) return NextResponse.json({ error: 'Tệp zip tối đa 20MB.' }, { status: 413 });

  const zipBuf = Buffer.from(await file.arrayBuffer());
  if (zipBuf.toString('ascii', 0, 2) !== 'PK') {
    return NextResponse.json({ error: 'Tệp không phải định dạng .zip.' }, { status: 415 });
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(zipBuf));
  } catch {
    return NextResponse.json({ error: 'Không giải nén được tệp zip.' }, { status: 400 });
  }

  // Lọc: bỏ thư mục, tệp hệ thống, và giữ thứ tự theo tên
  const names = Object.keys(entries)
    .filter((n) => !n.endsWith('/'))
    .filter((n) => !n.split('/').some((p) => p.startsWith('.') || p === '__MACOSX'))
    .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));

  const slugBase = toSlug(rawName);
  let slug = slugBase;
  if (await db.stickerPack.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
  }

  const items: { name: string; url: string; storageKey: string; order: number }[] = [];
  const skipped: string[] = [];

  for (const entry of names) {
    if (items.length >= MAX_ITEMS) { skipped.push(`${entry} (vượt ${MAX_ITEMS} ảnh)`); continue; }

    const buf = Buffer.from(entries[entry]);
    if (buf.length === 0 || buf.length > MAX_ITEM) { skipped.push(`${entry} (rỗng hoặc >1MB)`); continue; }

    const kind = sniffImage(buf);
    if (!kind) { skipped.push(`${entry} (không phải ảnh)`); continue; }
    if (kind.ext === 'svg' && svgLooksUnsafe(buf)) { skipped.push(`${entry} (SVG chứa mã kịch bản)`); continue; }

    const stored = await putFile(buf, newObjectName(kind.ext, `stickers/${slug}`), kind.mime);
    const base = entry.split('/').pop() ?? entry;
    items.push({
      name: base.replace(/\.[^.]+$/, '').slice(0, 60),
      url: stored.url,
      storageKey: stored.key,
      order: items.length,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: 'Không tìm thấy ảnh hợp lệ trong tệp zip.', skipped }, { status: 400 });
  }

  const pack = await db.stickerPack.create({
    data: {
      slug,
      name: rawName.slice(0, 60),
      stickers: { create: items },
    },
    select: { id: true, name: true, _count: { select: { stickers: true } } },
  });

  return NextResponse.json({ ok: true, pack: { id: pack.id, name: pack.name, count: pack._count.stickers }, skipped });
}
