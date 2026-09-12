import { NextResponse } from 'next/server';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { doanLoaiAnh, luuAnh } from '@/lib/kho-anh';
import { conDuocDangAnh, ghiLanDangAnh } from '@/lib/chan-do-mat-khau';

export const dynamic = 'force-dynamic';
/* Ảnh đi thẳng qua máy chủ này rồi mới sang kho, nên phải chạy ở Node —
   không dùng được runtime edge với `@aws-sdk`. */
export const runtime = 'nodejs';

/*
 * POST /api/tai-anh — nhận một ảnh, trả về địa chỉ công khai.
 *
 * MỘT CỔNG, HAI MỨC QUYỀN, và mức quyền quyết định cả chỗ để lẫn cỡ tối đa:
 *
 *   • `icon`, `anh-chup` — chỉ quản trị. Đây là ảnh của cửa hàng.
 *   • `dien-dan`        — thành viên đã đăng nhập, và có cửa chặn đếm lượt.
 *
 * Viết thành route handler chứ không thành server action: server action nhận
 * FormData được, nhưng ở đây cần trả mã lỗi HTTP rõ ràng cho phía trình duyệt
 * xử lý từng trường hợp (quá cỡ, sai định dạng, hết lượt), mà server action
 * thì chỉ trả về một cục dữ liệu.
 */

const CHO_DAT = {
  icon: { thuMuc: 'icon', toiDa: 512 * 1024, canQuanTri: true },
  'anh-chup': { thuMuc: 'anh-chup', toiDa: 3 * 1024 * 1024, canQuanTri: true },
  'dien-dan': { thuMuc: 'dien-dan', toiDa: 3 * 1024 * 1024, canQuanTri: false },
} as const;

type MaChoDat = keyof typeof CHO_DAT;

export async function POST(req: Request) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) {
    return NextResponse.json({ loi: 'Bạn cần đăng nhập để tải ảnh lên.' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ loi: 'Không đọc được dữ liệu gửi lên.' }, { status: 400 });

  const cho = String(form.get('cho') ?? '') as MaChoDat;
  const luat = CHO_DAT[cho];
  if (!luat) return NextResponse.json({ loi: 'Chỗ đặt ảnh không hợp lệ.' }, { status: 400 });

  if (luat.canQuanTri && nguoi.vaiTro !== 'QUAN_TRI') {
    return NextResponse.json({ loi: 'Bạn không có quyền làm việc này.' }, { status: 403 });
  }

  /*
   * Cửa chặn cho ảnh diễn đàn.
   *
   * Ảnh là thứ NẶNG nhất một thành viên thường gửi lên được, và mỗi tấm là một
   * tệp nằm lại trong kho mãi mãi. Không đếm thì một tài khoản bắn kịch bản là
   * đủ làm đầy thùng và đội hoá đơn.
   */
  if (!luat.canQuanTri) {
    const cua = await conDuocDangAnh(nguoi.id);
    if (cua.chan) {
      return NextResponse.json(
        { loi: `Bạn vừa tải lên khá nhiều ảnh. Thử lại sau ${cua.conPhut} phút.` },
        { status: 429 },
      );
    }
  }

  const tep = form.get('tep');
  if (!(tep instanceof File)) {
    return NextResponse.json({ loi: 'Chưa chọn tệp ảnh.' }, { status: 400 });
  }

  // Xét cỡ TRƯỚC khi đọc vào bộ nhớ: đọc cả tệp trăm megabyte rồi mới chê là
  // đã tốn đúng chỗ mà kẻ gửi muốn ta tốn.
  if (tep.size > luat.toiDa) {
    return NextResponse.json(
      { loi: `Ảnh nặng quá ${Math.round(luat.toiDa / 1024 / 1024 * 10) / 10}MB.` },
      { status: 413 },
    );
  }
  if (tep.size === 0) return NextResponse.json({ loi: 'Tệp rỗng.' }, { status: 400 });

  const ruot = new Uint8Array(await tep.arrayBuffer());

  /*
   * Nhìn vào RUỘT tệp, không tin cái nhãn.
   *
   * `Content-Type` và đuôi tệp đều do phía gửi đặt nên bịa được cả hai. Một
   * tệp tên `.png`, nhãn `image/png`, mà ruột là kịch bản shell thì trượt ở
   * đây — và đó đúng là thứ ta không muốn nằm trong một thùng công khai.
   */
  const loai = doanLoaiAnh(ruot);
  if (!loai) {
    return NextResponse.json(
      { loi: 'Tệp này không phải ảnh PNG, JPG, GIF hay WebP.' },
      { status: 415 },
    );
  }

  try {
    const daLuu = await luuAnh(ruot, luat.thuMuc, loai);
    if (!luat.canQuanTri) await ghiLanDangAnh(nguoi.id);
    return NextResponse.json({ duongDan: daLuu.duongDan });
  } catch {
    // Kho hỏng hay thiếu cấu hình thì nói thật, đừng để người dùng ngồi đoán.
    return NextResponse.json(
      { loi: 'Không lưu được ảnh. Kho ảnh đang có vấn đề.' },
      { status: 502 },
    );
  }
}
