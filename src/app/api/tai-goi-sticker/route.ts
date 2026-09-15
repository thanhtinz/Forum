import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { doanLoaiAnh, luuAnh } from '@/lib/kho';
import { docZip } from '@/lib/doc-zip';
import { STICKER_MOI_GOI, ZIP_TOI_DA, ZIP_TONG_BUNG, STICKER_TOI_DA } from '@/lib/cam-xuc-const';

/*
 * TẢI CẢ MỘT GÓI STICKER BẰNG TỆP ZIP.
 *
 * Một bộ sticker mua về hay tải về bao giờ cũng là một tệp nén mấy chục tấm.
 * Bắt người quản trị giải nén ra rồi chọn từng tấm — hoặc chọn cả ba mươi tấm
 * một lúc qua hộp chọn tệp — thì vẫn chạy, nhưng đó là ba mươi lượt tải lên
 * nối đuôi nhau, mỗi lượt một lần đi về; ném thẳng tệp zip vào là MỘT lượt.
 *
 * Là một route thay vì một server action, cùng lẽ với `/api/tai-anh`: chỗ này
 * cần trả mã lỗi HTTP rõ ràng cho từng trường hợp (quá nặng, không phải zip,
 * gói đã đầy), mà server action thì chỉ trả về một cục dữ liệu.
 *
 * MỌI THỨ TRONG TỆP ZIP ĐỀU LÀ THỨ NGƯỜI NGOÀI ĐẶT — kể cả tên tệp, kể cả mấy
 * con số khai cỡ. Xem `doc-zip.ts` để biết mấy cái chặn; ở đây chỉ nhắc lại
 * một điều: TÊN TỆP TRONG ZIP KHÔNG BAO GIỜ THÀNH TÊN TỆP TRÊN ĐĨA. Tên lưu
 * xuống do `luuAnh` tự sinh, y hệt đường đi của một tấm ảnh tải lẻ.
 */
export async function POST(req: Request) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) return NextResponse.json({ loi: 'Bạn cần đăng nhập.' }, { status: 401 });
  if (nguoi.vaiTro !== 'QUAN_TRI') {
    return NextResponse.json({ loi: 'Bạn không có quyền làm việc này.' }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ loi: 'Không đọc được dữ liệu gửi lên.' }, { status: 400 });

  const goiId = String(form.get('goiId') ?? '');
  const tep = form.get('tep');
  if (!(tep instanceof File)) {
    return NextResponse.json({ loi: 'Chưa chọn tệp zip.' }, { status: 400 });
  }
  if (tep.size === 0) return NextResponse.json({ loi: 'Tệp rỗng.' }, { status: 400 });
  // Cân TRƯỚC khi đọc vào bộ nhớ, cùng lẽ với cổng ảnh lẻ.
  if (tep.size > ZIP_TOI_DA) {
    return NextResponse.json(
      { loi: `Tệp zip nặng quá ${Math.round(ZIP_TOI_DA / 1024 / 1024)}MB.` },
      { status: 413 },
    );
  }

  const goi = await db.goiSticker.findUnique({
    where: { id: goiId },
    select: { id: true, _count: { select: { sticker: true } } },
  });
  if (!goi) return NextResponse.json({ loi: 'Không tìm thấy gói này.' }, { status: 404 });

  const conCho = STICKER_MOI_GOI - goi._count.sticker;
  if (conCho <= 0) {
    return NextResponse.json(
      { loi: `Gói này đã đủ ${STICKER_MOI_GOI} hình.` },
      { status: 409 },
    );
  }

  let muc;
  try {
    muc = docZip(new Uint8Array(await tep.arrayBuffer()), {
      soMucToiDa: 400,
      moiMucToiDa: STICKER_TOI_DA,
      tongToiDa: ZIP_TONG_BUNG,
    });
  } catch (e) {
    const ma = e instanceof Error ? e.message : '';
    const cau = ma === 'khong-phai-zip' ? 'Tệp này không phải tệp zip.'
      : ma === 'qua-nhieu-muc' ? 'Tệp zip có quá nhiều mục.'
        : ma === 'muc-qua-nang' || ma === 'tong-qua-nang'
          ? 'Ảnh bên trong nặng quá mức cho phép.'
          : 'Không mở được tệp zip này.';
    return NextResponse.json({ loi: cau }, { status: 415 });
  }

  /*
   * Xếp theo TÊN trong gói, và đó là thứ tự người vẽ bộ sticker đã chọn.
   *
   * Tên kiểu `01.png`, `02.png` là cách ai cũng đánh số một bộ hình. Lấy theo
   * thứ tự zip nhét vào thì thứ tự phụ thuộc phần mềm nén của người khác.
   * `numeric` để `10` đứng sau `9` chứ không đứng sau `1`.
   */
  muc.sort((a, b) => a.ten.localeCompare(b.ten, 'vi', { numeric: true }));

  const cuoi = await db.sticker.findFirst({
    where: { goiId: goi.id }, orderBy: { thuTu: 'desc' }, select: { thuTu: true },
  });
  let thuTu = cuoi?.thuTu ?? 0;

  let daThem = 0;
  let boQua = 0;

  for (const m of muc) {
    if (daThem >= conCho) break;

    /*
     * Nhìn RUỘT từng tấm, không tin đuôi tên trong zip.
     *
     * Đây là chỗ mấy tệp không phải ảnh rơi ra: một gói tải về trên mạng
     * thường có kèm `readme.txt`, thư mục `__MACOSX`, `.DS_Store`. Chúng
     * không phải lỗi của người tải lên, nên ĐẾM rồi báo lại chứ không chối
     * cả gói.
     */
    const loai = doanLoaiAnh(m.ruot);
    if (!loai) { boQua++; continue; }

    try {
      const daLuu = await luuAnh(m.ruot, 'sticker', loai);
      thuTu += 10;
      await db.sticker.create({
        data: { goiId: goi.id, anh: daLuu.duongDan, thuTu }, select: { id: true },
      });
      daThem++;
    } catch {
      return NextResponse.json(
        { loi: `Đã thêm ${daThem} hình thì kho ảnh có vấn đề. Thử lại sau nhé.` },
        { status: 502 },
      );
    }
  }

  if (daThem === 0) {
    return NextResponse.json(
      { loi: 'Trong tệp zip không có tấm ảnh nào đọc được.' },
      { status: 422 },
    );
  }

  return NextResponse.json({ daThem, boQua, conLai: muc.length - daThem - boQua });
}
