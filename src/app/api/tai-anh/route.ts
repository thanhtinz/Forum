import { NextResponse } from 'next/server';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { doanLoaiAnh, luuAnh } from '@/lib/kho';
import { doCoAnh } from '@/lib/co-anh';
import {
  ANH_CHUP_TOI_THIEU, BIA_RONG_TOI_THIEU, BIA_TI_LE_TOI_THIEU, ICON_TOI_THIEU,
} from '@/lib/luat-anh-const';
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
  /*
   * `canhToiThieu` là luật tài sản của cửa hàng, xem `luat-anh-const.ts`.
   * `vuong` chỉ đặt cho biểu tượng: biểu tượng bị cắt thành hình vuông lúc
   * bày, nên một tấm chữ nhật gửi lên là một tấm sẽ mất hai bên mà người gửi
   * không hay — thà từ chối ngay còn hơn để họ tự phát hiện ở trang chủ.
   */
  icon: {
    thuMuc: 'icon', toiDa: 512 * 1024, canQuanTri: true,
    canhToiThieu: ICON_TOI_THIEU, vuong: true, ngang: false,
  },
  // Ảnh bìa nặng hơn hẳn mấy thứ khác vì nó trải cả bề ngang màn hình.
  bia: {
    thuMuc: 'bia', toiDa: 2 * 1024 * 1024, canQuanTri: true,
    canhToiThieu: 0, vuong: false, ngang: true,
  },
  'anh-chup': {
    thuMuc: 'anh-chup', toiDa: 3 * 1024 * 1024, canQuanTri: true,
    canhToiThieu: ANH_CHUP_TOI_THIEU, vuong: false, ngang: false,
  },
  /*
   * Ảnh bìa của một đoạn phim: tấm hiện ra TRƯỚC khi phim chạy.
   *
   * Không đòi nằm ngang như ảnh bìa game, vì phim game điện thoại phần lớn
   * dựng đứng — đòi ngang là buộc người bày hàng cắt mất hai đầu cảnh chơi.
   * Chỉ đòi đủ điểm ảnh, cùng sàn với ảnh chụp màn hình.
   */
  'phim-bia': {
    thuMuc: 'phim-bia', toiDa: 2 * 1024 * 1024, canQuanTri: true,
    canhToiThieu: ANH_CHUP_TOI_THIEU, vuong: false, ngang: false,
  },
  // Ảnh thẻ sự kiện: cùng luật nằm ngang với ảnh bìa, vì thẻ cũng cắt 16:9.
  'su-kien': {
    thuMuc: 'su-kien', toiDa: 2 * 1024 * 1024, canQuanTri: true,
    canhToiThieu: 0, vuong: false, ngang: true,
  },
  // Ảnh trong bài diễn đàn không có luật cỡ: người ta dán ảnh chụp lỗi, ảnh
  // chụp màn hình điện thoại cũ, có tấm bé tí — và tấm bé tí ấy vẫn nói đúng
  // thứ cần nói. Luật tài sản là luật của HÀNG BÀY, không phải của lời bình.
  'dien-dan': {
    thuMuc: 'dien-dan', toiDa: 3 * 1024 * 1024, canQuanTri: false,
    canhToiThieu: 0, vuong: false, ngang: false,
  },
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

  /*
   * ĐỦ LỚN ĐỂ ĐỌC ĐƯỢC Ở MỌI CỠ.
   *
   * Đọc số đo thẳng từ phần đầu tệp — xem `co-anh.ts`. Không đọc ra được thì
   * cũng từ chối: tệp mà ngay cái đầu đã không đọc nổi thì trình duyệt người
   * xem cũng chẳng vẽ ra được, chỉ khác là lúc ấy mới lộ.
   */
  if (luat.canhToiThieu > 0 || luat.ngang) {
    const co = doCoAnh(ruot, loai);
    if (!co) {
      return NextResponse.json({ loi: 'Không đọc được kích thước của ảnh này.' }, { status: 415 });
    }
    if (Math.min(co.rong, co.cao) < luat.canhToiThieu) {
      return NextResponse.json(
        { loi: `Ảnh nhỏ quá: ${co.rong}×${co.cao}, cần ít nhất ${luat.canhToiThieu} điểm ảnh mỗi cạnh.` },
        { status: 422 },
      );
    }
    if (luat.vuong && co.rong !== co.cao) {
      return NextResponse.json(
        { loi: `Biểu tượng phải vuông, tấm này ${co.rong}×${co.cao}.` },
        { status: 422 },
      );
    }
    if (luat.ngang && (co.rong < BIA_RONG_TOI_THIEU || co.rong < co.cao * BIA_TI_LE_TOI_THIEU)) {
      return NextResponse.json(
        {
          loi: `Ảnh bìa phải nằm ngang và rộng ít nhất ${BIA_RONG_TOI_THIEU} điểm ảnh,`
            + ` tấm này ${co.rong}×${co.cao}.`,
        },
        { status: 422 },
      );
    }
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
