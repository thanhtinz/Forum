import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const dynamic = 'force-dynamic';

/*
 * GET /api/tai/{tepId} — ghi nhận lượt tải rồi đưa thẳng sang tệp.
 *
 * Đi vòng qua đây thay vì để thẻ <a> trỏ thẳng vào tệp, vì ba việc phải xảy ra
 * cùng lúc với cái bấm ấy: cộng bộ đếm của game, ghi tệp vào thư viện của
 * người tải, và kiểm rằng game vẫn còn đang hiện. Nút trỏ thẳng thì cả ba đều
 * không xảy ra, mà con số lượt tải là thứ cả trang chủ lẫn bảng xếp hạng đều
 * dựa vào.
 *
 * Điều kiện "game đang hiện" nằm TRONG câu truy vấn: lọc sau khi lấy về thì
 * vẫn có một khoảnh khắc mã đang cầm đường dẫn của một game đã bị gỡ.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ tepId: string }> }) {
  const { tepId } = await params;

  const tep = await db.tepTai.findFirst({
    where: { id: tepId, ban: { game: { trangThai: 'DANG_HIEN' } } },
    select: {
      duongDan: true,
      ban: { select: { heMay: true, soHieu: true, gameId: true } },
    },
  });
  if (!tep) return NextResponse.json({ loi: 'KHONG_TIM_THAY' }, { status: 404 });

  const nguoi = await nguoiHienTai();

  await db.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: tep.ban.gameId },
      data: { soLuotTai: { increment: 1 } },
      select: { id: true },
    });

    // Khách vãng lai vẫn tải được — chỉ là không có thư viện để ghi vào.
    if (nguoi) {
      await tx.luotTai.upsert({
        where: { gameId_nguoiId: { gameId: tep.ban.gameId, nguoiId: nguoi.id } },
        update: {
          heMay: tep.ban.heMay, soHieu: tep.ban.soHieu,
          lanCuoi: new Date(), soLan: { increment: 1 },
        },
        create: {
          gameId: tep.ban.gameId, nguoiId: nguoi.id,
          heMay: tep.ban.heMay, soHieu: tep.ban.soHieu,
        },
        select: { id: true },
      });
    }
  });

  return NextResponse.redirect(new URL(tep.duongDan, _req.url), 302);
}
