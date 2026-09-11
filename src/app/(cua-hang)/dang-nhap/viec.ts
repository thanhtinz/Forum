'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { conDuocDangKy, conDuocThu, ghiLanDangKy, ghiLanHong, xoaLanHong } from '@/lib/chan-do-mat-khau';
import { bamMatKhau, donPhienCu, dongPhien, khopMatKhau, moPhien } from '@/lib/xac-thuc';
import { thanhDuongDan } from '@/lib/tien-ich';

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
    where: { OR: [{ email: dinhDanh }, { tenDangNhap: dinhDanh }] },
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
  redirect('/');
}

/*
 * Trần độ dài, cùng con số với trang Cài đặt tài khoản.
 *
 * Trước đây lối đăng ký chỉ có sàn mà không có trần, còn `luuHoSo` thì chặn ở
 * 40 — nghĩa là mở tài khoản với cái tên dài mười nghìn chữ thì được, mà sau
 * đó chính chủ vào Cài đặt sửa lại tên ấy thì bị từ chối. Hai cửa vào cùng một
 * cột thì phải cùng một luật.
 */
const TEN_TOI_DA = 40;
const EMAIL_TOI_DA = 190;
/* Trần mật khẩu không phải để bắt bẻ ai: bcrypt băm chuỗi dài nào cũng tốn
 * CPU theo độ dài, nên một ô nhập không trần là một lối làm nghẽn máy chủ. */
const MAT_KHAU_TOI_DA = 200;

export async function dangKy(_truoc: KetQuaXacThuc, form: FormData): Promise<KetQuaXacThuc> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const tenHienThi = String(form.get('tenHienThi') ?? '').trim();
  const matKhau = String(form.get('matKhau') ?? '');

  if (email.length > EMAIL_TOI_DA) return { loi: 'Địa chỉ email dài quá.' };
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return { loi: 'Địa chỉ email trông không hợp lệ.' };
  if (tenHienThi.length < 2) return { loi: 'Tên hiển thị cần ít nhất 2 ký tự.' };
  if (tenHienThi.length > TEN_TOI_DA) return { loi: `Tên hiển thị dài quá ${TEN_TOI_DA} ký tự.` };
  if (matKhau.length < 8) return { loi: 'Mật khẩu cần ít nhất 8 ký tự.' };
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

  /*
   * Tên đăng nhập suy ra từ tên hiển thị; trùng thì nối thêm số.
   *
   * VÒNG LẶP CÓ TRẦN, và hết trần thì bốc ngẫu nhiên. Bản trước lặp "cho tới
   * khi rỗi" — mười nghìn người cùng tên "Minh" là lượt đăng ký thứ mười nghìn
   * phải hỏi CSDL mười nghìn lượt trước khi được vào, và ai cũng dựng được
   * tình cảnh ấy bằng cách mở sẵn một loạt tài khoản cùng tên.
   */
  const goc = thanhDuongDan(tenHienThi).slice(0, 30) || 'thanhvien';
  let tenDangNhap = goc;
  let ronh = false;
  for (let i = 2; i <= 20; i++) {
    if (!(await db.nguoiDung.findUnique({ where: { tenDangNhap }, select: { id: true } }))) {
      ronh = true;
      break;
    }
    tenDangNhap = `${goc}${i}`;
  }
  // Hai mươi lượt mà vẫn kẹt thì thôi đếm, bốc một đuôi ngẫu nhiên. Xấu hơn
  // "minh21" một chút, nhưng nó KẾT THÚC — mà tên đăng nhập thì đổi được sau.
  if (!ronh) tenDangNhap = `${goc}-${Math.random().toString(36).slice(2, 8)}`;

  const matKhauBam = await bamMatKhau(matKhau);
  let nguoi;
  try {
    nguoi = await db.nguoiDung.create({
      data: { email, tenDangNhap, tenHienThi, matKhauBam },
      select: { id: true },
    });
  } catch {
    /*
     * Hai lượt đăng ký cùng lúc mới lọt được tới đây: cả hai đọc thấy email
     * (hoặc tên đăng nhập) còn rỗi, rồi cả hai cùng ghi. Không bắt thì lượt
     * thua cuộc nhận nguyên một trang lỗi 500 — trong khi điều cần nói với họ
     * chỉ là "thử lại lần nữa".
     */
    return { loi: 'Không mở được tài khoản lúc này. Thử lại giúp mình nhé.' };
  }

  await ghiLanDangKy();
  await moPhien(nguoi.id);
  redirect('/');
}

export async function dangXuat(): Promise<void> {
  await dongPhien();
  redirect('/');
}
