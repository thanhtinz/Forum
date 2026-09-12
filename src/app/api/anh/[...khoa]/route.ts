import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { dungR2, trongKhoDia } from '@/lib/kho';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * GET /api/anh/<thư mục>/<tên> — phát một ảnh của LỐI DỰ PHÒNG.
 *
 * Chỉ dùng khi chưa cấu hình R2. Cấu hình rồi thì ảnh nằm trên tên miền của
 * kho và không lượt gọi nào chạm tới đây.
 *
 * VÌ SAO CẦN CỔNG NÀY thay vì cứ để tệp trong `public/`: `next start` chỉ phục
 * vụ những gì có trong `public/` LÚC DỰNG, nên ảnh ghi vào đó sau khi máy chủ
 * đã chạy đều trả 404. Đã thử tận tay rồi mới biết.
 */

const KIEU: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

export async function GET(_req: Request, { params }: { params: Promise<{ khoa: string[] }> }) {
  // Cấu hình R2 rồi thì cổng này không có việc gì — trả 404 cho gọn, đừng để
  // nó thành một lối đọc đĩa còn mở toang trên máy chủ thật.
  if (dungR2()) return new NextResponse(null, { status: 404 });

  const { khoa } = await params;

  // Chống thoát thư mục — xem `trongKhoDia`, dùng chung với cổng phát tệp.
  const duong = trongKhoDia(khoa);
  if (!duong) return new NextResponse(null, { status: 404 });

  const duoi = duong.split('.').pop()?.toLowerCase() ?? '';
  const kieu = KIEU[duoi];
  // Chỉ phát đúng bốn loại ảnh ta tự ghi ra. Thứ khác nằm trong thư mục ấy
  // (nếu có) không phải thứ cổng này có nhiệm vụ đưa cho ai.
  if (!kieu) return new NextResponse(null, { status: 404 });

  try {
    const tin = await stat(duong);
    if (!tin.isFile()) return new NextResponse(null, { status: 404 });

    const dong = Readable.toWeb(createReadStream(duong)) as ReadableStream;
    return new NextResponse(dong, {
      headers: {
        'Content-Type': kieu,
        'Content-Length': String(tin.size),
        // Tên tệp mang mã ngẫu nhiên nên ruột không bao giờ đổi — giữ bản sao
        // rất lâu, đỡ hẳn một lượt gọi cho người xem lại trang.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
