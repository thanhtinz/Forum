import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { dungR2, trongKhoDia } from '@/lib/kho';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * GET /api/phim/phim/<tên> — phát một ĐOẠN PHIM của lối dự phòng.
 *
 * KHÁC HAI CỔNG KIA Ở MỘT CHỖ, VÀ CHỖ ẤY BẮT BUỘC: cổng này trả lời được yêu
 * cầu THEO KHÚC (`Range`). Ảnh và tệp cài đặt thì tải một lèo từ đầu tới cuối,
 * còn phim thì trình duyệt xin từng khúc — nó xin mấy chục kilobyte đầu để đọc
 * phần mô tả, rồi xin khúc giữa khi người xem kéo thanh thời gian. Safari còn
 * đi xa hơn: không thấy máy chủ trả `206` kèm `Accept-Ranges` thì nó KHÔNG
 * phát, chỉ hiện một ô đen. Nên thiếu phần này là phim không chạy trên iPhone
 * — đúng loại máy hay mở cửa hàng này.
 *
 * Cấu hình R2 rồi thì phim nằm trên tên miền của kho, và Cloudflare tự lo phần
 * `Range` — không lượt nào chạm tới đây.
 */
export async function GET(req: Request, { params }: { params: Promise<{ khoa: string[] }> }) {
  if (dungR2()) return new NextResponse(null, { status: 404 });

  const { khoa } = await params;
  const duong = trongKhoDia(khoa);
  if (!duong) return new NextResponse(null, { status: 404 });
  if (!duong.toLowerCase().endsWith('.mp4')) return new NextResponse(null, { status: 404 });

  let tin;
  try {
    tin = await stat(duong);
    if (!tin.isFile()) return new NextResponse(null, { status: 404 });
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const chung = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  const xin = req.headers.get('range');
  if (!xin) {
    const dong = Readable.toWeb(createReadStream(duong)) as ReadableStream;
    return new NextResponse(dong, {
      headers: { ...chung, 'Content-Length': String(tin.size) },
    });
  }

  /*
   * Chỉ đọc dạng `bytes=a-b` — dạng duy nhất trình duyệt gửi cho phim.
   *
   * Dạng nhiều khúc (`bytes=0-9,20-29`) thì bỏ qua và trả cả tệp: nó hợp lệ
   * theo chuẩn nhưng không trình duyệt nào dùng cho thẻ `video`, mà trả lời nó
   * đúng cách thì phải dựng cả một thân `multipart/byteranges`. Trả cả tệp vẫn
   * là câu trả lời ĐÚNG, chỉ là không tiết kiệm.
   */
  const khop = /^bytes=(\d*)-(\d*)$/.exec(xin.trim());
  if (!khop || (!khop[1] && !khop[2])) {
    const dong = Readable.toWeb(createReadStream(duong)) as ReadableStream;
    return new NextResponse(dong, { headers: { ...chung, 'Content-Length': String(tin.size) } });
  }

  let dau: number;
  let cuoi: number;
  if (khop[1]) {
    dau = Number(khop[1]);
    cuoi = khop[2] ? Math.min(Number(khop[2]), tin.size - 1) : tin.size - 1;
  } else {
    // `bytes=-500` nghĩa là "năm trăm byte CUỐI".
    dau = Math.max(0, tin.size - Number(khop[2]));
    cuoi = tin.size - 1;
  }

  // Xin quá mép tệp thì phải trả 416 kèm cỡ thật, không trả một khúc rỗng: trả
  // khúc rỗng thì trình duyệt tưởng phim hết ở đó và dừng luôn.
  if (dau >= tin.size || dau > cuoi) {
    return new NextResponse(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${tin.size}` },
    });
  }

  const dong = Readable.toWeb(createReadStream(duong, { start: dau, end: cuoi })) as ReadableStream;
  return new NextResponse(dong, {
    status: 206,
    headers: {
      ...chung,
      'Content-Length': String(cuoi - dau + 1),
      'Content-Range': `bytes ${dau}-${cuoi}/${tin.size}`,
    },
  });
}
