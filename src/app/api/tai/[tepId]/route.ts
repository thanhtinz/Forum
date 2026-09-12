import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ghiLuotTai } from '@/lib/ghi-luot-tai';
import { xemDiaChi } from '@/lib/dia-chi-an-toan';

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

  await ghiLuotTai(tep.ban.gameId, tep.ban.heMay, tep.ban.soHieu);

  /*
   * KIỂM LẠI ĐỊA CHỈ NGAY TRƯỚC KHI CHUYỂN HƯỚNG, dù lúc nhập đã kiểm rồi.
   *
   * Không phải vì không tin người quản trị, mà vì hàng trong CSDL có thể tới
   * từ nơi khác: một lượt nhập liệu tay, một bản khôi phục cũ, hay chính lối
   * nhập mà bản trước đây quên kiểm. Chuyển hướng là chỗ THẬT SỰ nguy hiểm —
   * đường dẫn ra ngoài mà liên kết lại mang tên miền cửa hàng thì đó đúng là
   * thứ người ta dùng để lừa người khác bấm vào.
   *
   * Địa chỉ hỏng thì trả 404 chứ không trả lỗi máy chủ: với người bấm, một tệp
   * không dẫn đi đâu được và một tệp không tồn tại là cùng một chuyện.
   */
  const kieu = xemDiaChi(tep.duongDan);
  if (kieu === 'hong') {
    return NextResponse.json({ loi: 'DIA_CHI_HONG' }, { status: 404 });
  }

  // Đường dẫn trong nhà thì nối vào gốc của chính yêu cầu này; địa chỉ https
  // đầy đủ thì dùng nguyên. Không nối gốc vào một địa chỉ đã đủ, vì `URL` sẽ
  // im lặng bỏ gốc đi và ta mất luôn chỗ để nhìn ra mình đang làm gì.
  const dich = kieu === 'trong-nha' ? new URL(tep.duongDan, _req.url) : new URL(tep.duongDan);
  return NextResponse.redirect(dich, 302);
}
