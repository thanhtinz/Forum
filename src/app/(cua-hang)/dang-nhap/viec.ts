'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { conDuocDangKy, conDuocThu, ghiLanDangKy, ghiLanHong, xoaLanHong } from '@/lib/chan-do-mat-khau';
import { bamMatKhau, donPhienCu, dongPhien, khopMatKhau, moPhien } from '@/lib/xac-thuc';
import { thanhDuongDan } from '@/lib/tien-ich';
import {
  EMAIL_TOI_DA, MAT_KHAU_TOI_DA, MAT_KHAU_TOI_THIEU, TEN_TOI_DA,
} from '@/lib/luat-tai-khoan-const';
import { danhDauDaDung, phatMa, traMa } from '@/lib/ma-xac-minh';
import { HAN_MA_PHUT, TOI_DA_SAI, chiaCum } from '@/lib/ma-xac-minh-const';
import { guiThu, thuBat } from '@/lib/gui-thu';

export interface KetQuaXacThuc { loi?: string }

/*
 * Một câu báo lỗi DUY NHẤT cho mọi kiểu sai.
 *
 * Nói riêng "không có tài khoản này" thì bất kỳ ai cũng dò được email nào đã
 * đăng ký ở đây, chỉ bằng cách gõ thử. Nhập nhằng một chút ở đây đổi lại người
 * dùng khỏi bị lộ là họ có mặt trên trang này.
 */
const SAI = 'Tên đăng nhập hoặc mật khẩu không đúng.';

export async function dangNhap(_truoc: KetQuaXacThuc, form: FormData): Promise<KetQuaXacThuc> {
  const dinhDanh = String(form.get('dinhDanh') ?? '').trim().toLowerCase();
  const matKhau = String(form.get('matKhau') ?? '');
  if (!dinhDanh || !matKhau) return { loi: 'Hãy nhập đủ hai ô.' };

  /*
   * Hỏi cửa chặn TRƯỚC khi chạm vào CSDL và trước khi chạy bcrypt.
   *
   * Đặt trước vì bcrypt cố ý chạy chậm (cả trăm mili giây): để kẻ dò gọi được
   * tới đó thì mỗi lượt của họ vẫn ngốn một nhân CPU của máy chủ, và chặn hay
   * không cũng chẳng cứu được gì khi bị bắn hàng nghìn lượt.
   */
  const cua = await conDuocThu(dinhDanh);
  if (cua.chan) {
    return { loi: `Sai quá nhiều lần. Thử lại sau ${cua.conPhut} phút.` };
  }

  const nguoi = await db.nguoiDung.findFirst({
    // `xoaLuc: null` ngay trong `where`: mật khẩu của người đã xoá tuy đã bị
    // thay bằng chuỗi ngẫu nhiên, nhưng chặn ở đây thì không phải tin vào đúng
    // một lớp ấy.
    where: { xoaLuc: null, OR: [{ email: dinhDanh }, { tenDangNhap: dinhDanh }] },
    select: { id: true, matKhauBam: true, khoa: true },
  });

  /*
   * Vẫn so mật khẩu kể cả khi không có tài khoản.
   *
   * Trả về ngay thì lần gõ email không tồn tại xong sau vài mili giây, còn lần
   * gõ email có thật phải chờ bcrypt chạy cả trăm mili giây — chênh lệch ấy
   * bấm đồng hồ là đo được, và thành ra vẫn dò được ai đã đăng ký.
   */
  const bamGia = '$2a$10$abcdefghijklmnopqrstuv0123456789012345678901234567890';
  const dung = await khopMatKhau(matKhau, nguoi?.matKhauBam ?? bamGia);

  if (!nguoi || !dung) {
    await ghiLanHong(dinhDanh);
    return { loi: SAI };
  }
  // Tài khoản bị khoá KHÔNG tính là gõ sai: mật khẩu họ gõ đúng, và đếm nó vào
  // thì người bị khoá oan còn bị cấm thêm một lớp nữa.
  if (nguoi.khoa) return { loi: 'Tài khoản này đang bị khoá.' };

  await xoaLanHong(dinhDanh);
  await donPhienCu();
  await moPhien(nguoi.id);
  redirect(duongVe(form.get('tiep')));
}

/**
 * Đăng nhập xong thì về đâu.
 *
 * CHỈ NHẬN ĐƯỜNG DẪN TRONG NHÀ. Trường `tiep` đi kèm biểu mẫu, tức là ai cũng
 * sửa được — nhận bừa thì cửa hàng thành bàn đạp chuyển hướng: kẻ xấu gửi
 * `sunnystore.vn/dang-nhap?tiep=https://trang-gia.example`, nạn nhân thấy tên
 * miền quen nên đăng nhập, rồi bị ném sang trang giả mà vẫn tưởng mình đang ở
 * cửa hàng.
 *
 * Nên: phải bắt đầu bằng đúng MỘT dấu gạch chéo. `//trang-gia.example` là địa
 * chỉ tuyệt đối trá hình — trình duyệt đọc nó thành "cùng giao thức, khác tên
 * miền" — nên nó bị loại cùng với `https://…`.
 */
function duongVe(tiep: FormDataEntryValue | null): string {
  const chu = typeof tiep === 'string' ? tiep.trim() : '';
  if (!chu.startsWith('/') || chu.startsWith('//')) return '/';
  return chu;
}

/*
 * Trần độ dài, cùng con số với trang Cài đặt tài khoản.
 *
 * Trước đây lối đăng ký chỉ có sàn mà không có trần, còn `luuHoSo` thì chặn ở
 * 40 — nghĩa là mở tài khoản với cái tên dài mười nghìn chữ thì được, mà sau
 * đó chính chủ vào Cài đặt sửa lại tên ấy thì bị từ chối. Hai cửa vào cùng một
 * cột thì phải cùng một luật.
 */

export async function dangKy(_truoc: KetQuaXacThuc, form: FormData): Promise<KetQuaXacThuc> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const tenHienThi = String(form.get('tenHienThi') ?? '').trim();
  const matKhau = String(form.get('matKhau') ?? '');

  if (email.length > EMAIL_TOI_DA) return { loi: 'Địa chỉ email dài quá.' };
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return { loi: 'Địa chỉ email trông không hợp lệ.' };
  if (tenHienThi.length < 2) return { loi: 'Tên hiển thị cần ít nhất 2 ký tự.' };
  if (tenHienThi.length > TEN_TOI_DA) return { loi: `Tên hiển thị dài quá ${TEN_TOI_DA} ký tự.` };
  if (matKhau.length < MAT_KHAU_TOI_THIEU) return { loi: `Mật khẩu cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự.` };
  if (matKhau.length > MAT_KHAU_TOI_DA) return { loi: 'Mật khẩu dài quá.' };

  /*
   * Hỏi cửa chặn TRƯỚC khi chạy bcrypt, y như lối đăng nhập.
   *
   * Không có gì chặn thì một kịch bản bắn liên tục dựng được hàng nghìn tài
   * khoản, mỗi cái ngốn một lượt bcrypt của máy chủ, rồi đem đi rải bài.
   */
  const cua = await conDuocDangKy();
  if (cua.chan) {
    return { loi: `Chỗ này vừa mở quá nhiều tài khoản. Thử lại sau ${cua.conPhut} phút.` };
  }

  if (await db.nguoiDung.findUnique({ where: { email }, select: { id: true } })) {
    return { loi: 'Email này đã có tài khoản. Bạn muốn đăng nhập chứ?' };
  }

  const matKhauBam = await bamMatKhau(matKhau);

  /*
   * ─── KHÔNG GỬI ĐƯỢC THƯ: mở tài khoản luôn ───────────────────────────
   *
   * Thiếu cấu hình thư thì bắt xác minh email là khoá cửa hẳn — chẳng ai mở
   * được tài khoản nào nữa. Thà cho vào như trước đợt này, còn hơn dựng một
   * bước không thể đi qua.
   */
  if (!(await thuBat())) {
    let nguoi;
    try {
      nguoi = await db.nguoiDung.create({
        data: { email, tenDangNhap: await bocTenDangNhap(tenHienThi), tenHienThi, matKhauBam },
        select: { id: true },
      });
    } catch {
      /*
       * Hai lượt đăng ký cùng lúc mới lọt được tới đây: cả hai đọc thấy email
       * (hoặc tên đăng nhập) còn rỗi, rồi cả hai cùng ghi. Không bắt thì lượt
       * thua cuộc nhận nguyên một trang lỗi 500 — trong khi điều cần nói với
       * họ chỉ là "thử lại lần nữa".
       */
      return { loi: 'Không mở được tài khoản lúc này. Thử lại giúp mình nhé.' };
    }
    await ghiLanDangKy();
    await moPhien(nguoi.id);
    redirect('/');
  }

  /*
   * ─── GỬI ĐƯỢC THƯ: chưa dựng tài khoản, phát mã đã ───────────────────
   *
   * Hồ sơ nằm tạm trong hàng mã, không nằm ở bảng người dùng. Dựng sẵn tài
   * khoản rồi đánh dấu "chưa xác minh" là để người lạ CHIẾM CHỖ một địa chỉ
   * email họ không sở hữu: chủ thật của địa chỉ ấy tới sau sẽ bị chối vì email
   * đã có người dùng, mà người kia thì chẳng bao giờ xác minh nổi.
   *
   * Tên đăng nhập bốc ở trên cũng bỏ đi, để dựng lại lúc xác minh xong: giữ
   * chỗ một cái tên suốt một giờ cho một tài khoản có thể không bao giờ ra đời
   * là tự làm hẹp kho tên của người khác.
   */
  const ma = await phatMa('DANG_KY', email, { hoSo: { tenHienThi, matKhauBam } });

  const kq = await guiThu({
    toi: email,
    tieuDe: `${chiaCum(ma)} là mã xác minh SunnyStore`,
    chu: [
      `Chào ${tenHienThi},`,
      '',
      'Mã xác minh email để mở tài khoản SunnyStore của bạn là:',
      '',
      `    ${chiaCum(ma)}`,
      '',
      `Mã dùng được một lần và hết hạn sau ${HAN_MA_PHUT} phút.`,
      '',
      'Nếu không phải bạn mở tài khoản thì bỏ qua thư này —',
      'chưa có tài khoản nào được dựng lên cả.',
      '',
      'SunnyStore',
    ].join('\n'),
  });
  if (!kq.ok) {
    return { loi: 'Gửi thư xác minh không thành. Thử lại sau giúp mình nhé.' };
  }

  await ghiLanDangKy();
  redirect(`/xac-minh?email=${encodeURIComponent(email)}`);
}

/**
 * Bước hai của đăng ký: gõ mã trong thư vào, rồi tài khoản mới ra đời.
 *
 * Tên đăng nhập bốc Ở ĐÂY chứ không bốc lúc gửi mã, vì tới lúc này mới chắc
 * chắn có một tài khoản thật sự ra đời.
 */
export async function xacMinhDangKy(
  _truoc: KetQuaXacThuc, form: FormData,
): Promise<KetQuaXacThuc> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const ma = String(form.get('ma') ?? '');
  if (!email) return { loi: 'Thiếu địa chỉ email.' };

  const tra = await traMa('DANG_KY', email, ma);
  if (!tra.ok) {
    return {
      loi: tra.hetSuc
        ? `Gõ sai quá ${TOI_DA_SAI} lần nên mã này đã khoá. Mở lại tài khoản để nhận mã mới nhé.`
        : 'Mã không đúng hoặc đã hết hạn.',
    };
  }

  const { tenHienThi, matKhauBam } = tra.hang;
  if (!tenHienThi || !matKhauBam) return { loi: 'Mã không đúng hoặc đã hết hạn.' };

  // Email có thể đã bị người khác đăng ký xong trong lúc mã này nằm chờ.
  if (await db.nguoiDung.findUnique({ where: { email }, select: { id: true } })) {
    return { loi: 'Email này đã có tài khoản. Bạn muốn đăng nhập chứ?' };
  }

  if (!(await danhDauDaDung(tra.hang.id))) return { loi: 'Mã không đúng hoặc đã hết hạn.' };

  const tenDangNhap = await bocTenDangNhap(tenHienThi);

  let nguoi;
  try {
    nguoi = await db.nguoiDung.create({
      data: { email, tenDangNhap, tenHienThi, matKhauBam },
      select: { id: true },
    });
  } catch {
    return { loi: 'Không mở được tài khoản lúc này. Thử lại giúp mình nhé.' };
  }

  await moPhien(nguoi.id);
  redirect('/');
}

/**
 * Bốc một tên đăng nhập còn rỗi, suy ra từ tên hiển thị.
 *
 * VÒNG LẶP CÓ TRẦN, và hết trần thì bốc ngẫu nhiên. Bản trước lặp "cho tới khi
 * rỗi" — mười nghìn người cùng tên "Minh" là lượt đăng ký thứ mười nghìn phải
 * hỏi cơ sở dữ liệu mười nghìn lượt trước khi được vào, và ai cũng dựng được
 * tình cảnh ấy bằng cách mở sẵn một loạt tài khoản cùng tên.
 */
async function bocTenDangNhap(tenHienThi: string): Promise<string> {
  const goc = thanhDuongDan(tenHienThi).slice(0, 30) || 'thanhvien';
  let ten = goc;
  for (let i = 2; i <= 20; i++) {
    if (!(await db.nguoiDung.findUnique({ where: { tenDangNhap: ten }, select: { id: true } }))) {
      return ten;
    }
    ten = `${goc}${i}`;
  }
  // Hai mươi lượt mà vẫn kẹt thì thôi đếm, bốc một đuôi ngẫu nhiên. Xấu hơn
  // "minh21" một chút, nhưng nó KẾT THÚC — mà tên đăng nhập thì đổi được sau.
  return `${goc}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function dangXuat(): Promise<void> {
  await dongPhien();
  redirect('/');
}
