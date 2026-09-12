import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { quyenTrenGame } from '@/lib/quyen-game';
import { laMP4, luuPhim, xoaPhim } from '@/lib/kho';
import { PHIM_NANG_TOI_DA, PHIM_TOI_DA } from '@/lib/phim-const';
import { gonDungLuong } from '@/lib/tien-ich';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * POST /api/tai-len-phim?gameId=… — nhận một đoạn phim xem trước.
 *
 * Cùng lối với cổng nhận tệp game: thân yêu cầu CHÍNH LÀ tệp, chảy thẳng từ
 * trình duyệt qua máy chủ sang kho, không gom vào bộ nhớ. Phim nặng hơn ảnh cả
 * chục lần nên đây không phải chuyện tối ưu cho vui.
 */
export async function POST(req: Request) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) {
    return NextResponse.json({ loi: 'Bạn cần đăng nhập để tải phim lên.' }, { status: 401 });
  }

  const dc = new URL(req.url);
  const gameId = dc.searchParams.get('gameId') ?? '';

  /*
   * Quyền nằm TRONG câu truy vấn: `quyenTrenGame` trả về mảnh `where` chứ
   * không trả về câu trả lời đúng/sai, nên quên ghép vào thì câu truy vấn
   * không khớp gì cả — hỏng về phía an toàn.
   */
  let quyen;
  try { quyen = await quyenTrenGame(gameId); }
  catch { return NextResponse.json({ loi: 'Bạn không có quyền làm việc này.' }, { status: 403 }); }

  const game = await db.game.findFirst({ where: quyen.loc, select: { id: true, duongDan: true } });
  if (!game) {
    return NextResponse.json(
      { loi: 'Không tìm thấy game này, hoặc nó không phải của bạn.' },
      { status: 404 },
    );
  }

  // Trần ba đoạn, đúng luật App Store — xem `phim-const.ts`.
  const dangCo = await db.phimGame.count({ where: { gameId: game.id } });
  if (dangCo >= PHIM_TOI_DA) {
    return NextResponse.json(
      { loi: `Mỗi game chỉ bày được ${PHIM_TOI_DA} đoạn phim. Gỡ bớt một đoạn rồi thêm lại.` },
      { status: 409 },
    );
  }

  const khai = Number(req.headers.get('content-length') ?? '');
  if (!Number.isFinite(khai) || khai <= 0) {
    return NextResponse.json({ loi: 'Không đọc được cỡ tệp gửi lên.' }, { status: 411 });
  }
  if (khai > PHIM_NANG_TOI_DA) {
    return NextResponse.json(
      { loi: `Phim nặng quá ${gonDungLuong(PHIM_NANG_TOI_DA)}.` },
      { status: 413 },
    );
  }
  if (!req.body) return NextResponse.json({ loi: 'Không có tệp nào gửi lên.' }, { status: 400 });

  /*
   * Soi mấy byte đầu rồi mới cho chảy tiếp — cùng lối với cổng tệp game.
   *
   * Với phim thì phép soi này còn chặn thêm một chuyện: một tệp MKV hay AVI
   * đổi đuôi thành `.mp4` sẽ qua được mọi phép kiểm tên, rồi nằm trong kho mà
   * không trình duyệt nào phát được — mà lúc ấy người bày hàng chỉ thấy một ô
   * đen và không hiểu vì sao.
   */
  const doc = req.body.getReader();
  const dau: Uint8Array[] = [];
  let coDau = 0;
  let het = false;
  while (coDau < 16 && !het) {
    const mau = await doc.read();
    if (mau.done) { het = true; break; }
    dau.push(mau.value);
    coDau += mau.value.length;
  }
  const khucDau = new Uint8Array(coDau);
  { let i = 0; for (const m of dau) { khucDau.set(m, i); i += m.length; } }

  if (coDau === 0) return NextResponse.json({ loi: 'Tệp rỗng.' }, { status: 400 });
  if (!laMP4(khucDau)) {
    await doc.cancel().catch(() => {});
    return NextResponse.json(
      { loi: 'Chỉ nhận phim MP4. Tệp này không phải MP4, dù đuôi tên là gì.' },
      { status: 415 },
    );
  }

  const dong = new ReadableStream<Uint8Array>({
    start(o) {
      for (const m of dau) o.enqueue(m);
      if (het) o.close();
    },
    async pull(o) {
      if (het) return;
      const mau = await doc.read();
      if (mau.done) { het = true; o.close(); return; }
      o.enqueue(mau.value);
    },
    cancel(vi) { void doc.cancel(vi); },
  });

  let daLuu;
  try {
    daLuu = await luuPhim(dong, khai);
  } catch {
    return NextResponse.json({ loi: 'Không cất được phim. Kho đang có vấn đề.' }, { status: 502 });
  }

  try {
    const cuoi = await db.phimGame.findFirst({
      where: { gameId: game.id }, orderBy: { thuTu: 'desc' }, select: { thuTu: true },
    });
    const phim = await db.phimGame.create({
      data: {
        gameId: game.id,
        duongDan: daLuu.duongDan,
        dungLuong: BigInt(daLuu.dungLuong),
        // Chừa khoảng trống giữa hai đoạn, cùng lẽ với ảnh chụp: đổi chỗ về
        // sau chỉ phải ghi lại một con số chứ không đánh số lại cả dãy.
        thuTu: (cuoi?.thuTu ?? 0) + 10,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: phim.id, duongDan: daLuu.duongDan, dungLuong: daLuu.dungLuong });
  } catch {
    // Cất được mà ghi sổ hỏng thì dọn luôn: để lại là mấy chục megabyte không
    // ai trỏ tới, nằm tính tiền trong thùng cho tới ngày có người dọn.
    await xoaPhim(daLuu.duongDan);
    return NextResponse.json({ loi: 'Không ghi được phim vào game.' }, { status: 500 });
  }
}
