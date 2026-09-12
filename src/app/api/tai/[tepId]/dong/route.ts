import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ghiLuotTai } from '@/lib/ghi-luot-tai';
import { xemDiaChi } from '@/lib/dia-chi-an-toan';
import { kieuTep } from '@/lib/kho';
import { tenTepTaiVe } from '@/lib/ten-tep';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * GET /api/tai/{tepId}/dong — tệp CHẢY QUA máy chủ, để trang tải vẽ được tiến trình.
 *
 * VÌ SAO KHÔNG ĐỂ TRÌNH DUYỆT LẤY THẲNG TỆP.
 *
 * Trình duyệt tải một tệp thì thanh tiến trình nằm ở góc dưới cửa sổ nó, còn
 * trang của ta thì không hay biết gì. Muốn vẽ được tiến trình NGAY TRÊN TRANG
 * thì mã trên trang phải tự đọc từng khúc — mà đọc từng khúc thì vướng quy tắc
 * cùng nguồn: tệp nằm trên tên miền của kho R2 là một nguồn khác.
 *
 * Cho tệp chảy qua đây thì mọi tệp đều thành cùng nguồn với trang, không phải
 * đụng tới cấu hình CORS của thùng, và người xem không đọc ra được tệp thật
 * nằm ở đâu. Cái giá là băng thông đi qua máy chủ này — nên đây là lối của
 * TRANG TẢI, còn ai muốn lấy thẳng vẫn có `/api/tai/{tepId}` đưa sang tận nơi.
 *
 * Chảy THÀNH DÒNG, không gom vào bộ nhớ: một tệp ba trăm megabyte mà gom lại
 * thì mỗi người tải chiếm đúng bấy nhiêu RAM.
 */
export async function GET(req: Request, { params }: { params: Promise<{ tepId: string }> }) {
  const { tepId } = await params;

  const tep = await db.tepTai.findFirst({
    where: { id: tepId, ban: { game: { trangThai: 'DANG_HIEN' } } },
    select: {
      duongDan: true, loai: true, tenTep: true,
      ban: {
        select: {
          heMay: true, soHieu: true, gameId: true,
          game: { select: { ten: true, duongDan: true } },
        },
      },
    },
  });
  if (!tep) return NextResponse.json({ loi: 'KHONG_TIM_THAY' }, { status: 404 });

  // Kiểm lại địa chỉ ngay trước khi đi lấy, cùng lẽ với cổng chuyển hướng: một
  // hàng trong cơ sở dữ liệu có thể tới từ lối nhập của bản cũ hơn.
  if (xemDiaChi(tep.duongDan) === 'hong') {
    return NextResponse.json({ loi: 'DIA_CHI_HONG' }, { status: 404 });
  }

  let nguon: Response;
  try {
    /*
     * Lấy tệp bằng `fetch`, kể cả khi nó nằm ngay trên đĩa của máy này.
     *
     * Đọc thẳng đĩa thì nhanh hơn một nhịp, nhưng lại thành hai nhánh mã: một
     * nhánh cho tệp trong kho đĩa, một nhánh cho tệp trên R2 — và nhánh ít
     * người chạy là nhánh hỏng mà không ai biết. Một lối đi cho mọi chỗ đặt
     * tệp thì chỗ nào cũng được thử mỗi lần có người tải.
     */
    nguon = await fetch(new URL(tep.duongDan, req.url));
  } catch {
    return NextResponse.json({ loi: 'KHONG_LAY_DUOC' }, { status: 502 });
  }
  if (!nguon.ok || !nguon.body) {
    return NextResponse.json({ loi: 'KHONG_LAY_DUOC' }, { status: 502 });
  }

  // Ghi sổ SAU khi đã cầm chắc tệp trong tay: cộng bộ đếm cho một lượt tải
  // hỏng ngay từ đầu là làm con số lượt tải nói dối.
  await ghiLuotTai(tep.ban.gameId, tep.ban.heMay, tep.ban.soHieu);

  const dai = nguon.headers.get('content-length');
  const ten = tenTepTaiVe(tep.tenTep, tep.ban.game.duongDan, tep.ban.soHieu, tep.loai);

  return new NextResponse(nguon.body, {
    headers: {
      'Content-Type': kieuTep(tep.loai),
      // Có `Content-Length` thì trang mới vẽ được phần trăm; thiếu thì thanh
      // tiến trình tự chuyển sang kiểu chỉ đếm số byte đã nhận.
      ...(dai ? { 'Content-Length': dai } : {}),
      'Content-Disposition': `attachment; filename="${ten}"`,
      'Cache-Control': 'no-store',
    },
  });
}
