import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { dungR2, kieuTep, trongKhoDia } from '@/lib/kho';
import { laLoaiTep } from '@/lib/he-may';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * GET /api/tep/tep/<tên> — phát một TỆP GAME của lối dự phòng.
 *
 * Song sinh với `/api/anh`, và tách ra làm hai cổng là có ý: cổng ảnh chỉ phát
 * bốn loại ảnh, cổng này chỉ phát tám loại tệp cài đặt. Gộp làm một thì phải
 * nới danh sách cho phép của cả hai, mà danh sách nới rộng là thứ không ai
 * nhớ mình đã nới tới đâu.
 *
 * Cấu hình R2 rồi thì tệp nằm trên tên miền của kho và không ai chạm tới đây.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ khoa: string[] }> }) {
  if (dungR2()) return new NextResponse(null, { status: 404 });

  const { khoa } = await params;
  const duong = trongKhoDia(khoa);
  if (!duong) return new NextResponse(null, { status: 404 });

  const duoi = (duong.split('.').pop() ?? '').toUpperCase();
  if (!laLoaiTep(duoi)) return new NextResponse(null, { status: 404 });

  try {
    const tin = await stat(duong);
    if (!tin.isFile()) return new NextResponse(null, { status: 404 });

    const dong = Readable.toWeb(createReadStream(duong)) as ReadableStream;
    return new NextResponse(dong, {
      headers: {
        'Content-Type': kieuTep(duoi),
        'Content-Length': String(tin.size),
        // `attachment` chứ không để trình duyệt tự đoán: một tệp ZIP mở ngay
        // trong tab thì người bấm mất luôn cái tệp họ vừa xin.
        'Content-Disposition': `attachment; filename="${khoa[khoa.length - 1]}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
