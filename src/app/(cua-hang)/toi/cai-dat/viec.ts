'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import {
  bamMatKhau, batBuocDangNhap, dongPhien, dongPhienKhac, khopMatKhau,
} from '@/lib/xac-thuc';
import { LOI_DIA_CHI, laDiaChiHopLe } from '@/lib/dia-chi-an-toan';
import {
  CAU_XAC_NHAN, TEN_DA_XOA, emailDaXoa, tenDangNhapDaXoa,
} from '@/lib/xoa-tai-khoan-const';

export interface KetQua { ok?: string; loi?: string }

function chu(form: FormData, ten: string): string {
  return String(form.get(ten) ?? '').trim();
}

/**
 * Đổi tên hiển thị và ảnh đại diện.
 *
 * KHÔNG cho đổi tên đăng nhập và email. Tên đăng nhập nằm trong mọi bài viết
 * cũ của người ấy trên diễn đàn, còn email là thứ duy nhất dùng để nhận ra một
 * tài khoản — đổi được cả hai thì một tài khoản có thể hoá trang thành tài
 * khoản khác, và người đọc diễn đàn không còn lần được ai là ai.
 */
export async function luuHoSo(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const tenHienThi = chu(form, 'tenHienThi');
  if (tenHienThi.length < 2) return { loi: 'Tên hiển thị cần ít nhất 2 ký tự.' };
  if (tenHienThi.length > 40) return { loi: 'Tên hiển thị dài quá 40 ký tự.' };

  const anh = chu(form, 'anh');
  // Chỉ nhận ảnh qua https hoặc ảnh trong nhà. Bỏ ngỏ thì một địa chỉ
  // `javascript:` hay `data:` lọt thẳng vào thuộc tính src của thẻ ảnh.
  if (anh && !laDiaChiHopLe(anh)) return { loi: LOI_DIA_CHI };

  /*
   * Ô TÍCH ĐỌC THEO LỐI "CÓ MẶT LÀ BẬT".
   *
   * Trình duyệt KHÔNG gửi ô tích lúc nó đang tắt — không có tên ấy trong biểu
   * mẫu nghĩa là người ta vừa bỏ tích. Đọc bằng `?? mặc định bật` là ô ấy
   * không bao giờ tắt được.
   */
  const thuThongBao = form.get('thuThongBao') !== null;

  await db.nguoiDung.update({
    where: { id: nguoi.id },
    data: { tenHienThi, anh: anh || null, thuThongBao },
    select: { id: true },
  });

  revalidatePath('/toi');
  revalidatePath('/toi/cai-dat');
  return { ok: 'Đã lưu hồ sơ.' };
}

/**
 * Đổi mật khẩu.
 *
 * Bắt nhập mật khẩu CŨ, dù người dùng đã đăng nhập rồi. Lý do: một máy bỏ quên
 * ở quán net vẫn đang mở phiên là đủ để người lạ đổi mật khẩu rồi chiếm hẳn
 * tài khoản. Hỏi lại mật khẩu cũ là thứ duy nhất chặn được cú ấy.
 *
 * Đổi xong thì ĐÓNG mọi phiên khác — xem `dongPhienKhac` để biết vì sao.
 */
export async function doiMatKhau(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const cu = chu(form, 'matKhauCu');
  const moi = chu(form, 'matKhauMoi');
  const lai = chu(form, 'matKhauLai');

  if (moi.length < 8) return { loi: 'Mật khẩu mới cần ít nhất 8 ký tự.' };
  if (moi !== lai) return { loi: 'Hai lần gõ mật khẩu mới không khớp.' };
  if (moi === cu) return { loi: 'Mật khẩu mới trùng mật khẩu cũ.' };

  const hang = await db.nguoiDung.findUnique({
    where: { id: nguoi.id }, select: { matKhauBam: true },
  });
  if (!hang || !(await khopMatKhau(cu, hang.matKhauBam))) {
    return { loi: 'Mật khẩu hiện tại không đúng.' };
  }

  await db.nguoiDung.update({
    where: { id: nguoi.id },
    data: { matKhauBam: await bamMatKhau(moi) },
    select: { id: true },
  });

  const soDong = await dongPhienKhac(nguoi.id);

  return {
    ok: soDong > 0
      ? `Đã đổi mật khẩu, và đăng xuất ${soDong} thiết bị khác.`
      : 'Đã đổi mật khẩu.',
  };
}

/**
 * Người dùng tự xoá tài khoản của mình.
 *
 * XOÁ DANH TÍNH, KHÔNG XOÁ HÀNG — lý do dài đã ghi ngay trên cột `xoaLuc`
 * trong lược đồ. Gọn lại: bài viết và đánh giá treo vào hàng người dùng, xoá
 * hàng là khoét thủng cả những cuộc trò chuyện của người khác và gỡ luôn game
 * của người ấy khỏi kệ. Nên hàng ở lại, còn mọi thứ chỉ về một con người cụ
 * thể thì đi: email, mật khẩu, ảnh, tên, quyền, và mấy thứ riêng tư như danh
 * sách đã lưu hay hộp thông báo.
 *
 * BA LỚP CHẶN TAY TRƯỢT, vì việc này KHÔNG lùi lại được:
 *   • hỏi lại mật khẩu — một máy bỏ quên đang mở phiên thì người lạ xoá được;
 *   • bắt gõ đúng một câu dài, không phải bấm một cái là xong;
 *   • quản trị viên CUỐI CÙNG thì không cho đi, kẻo cửa hàng còn lại không ai
 *     mở nổi khu quản trị nữa.
 */
export async function xoaTaiKhoan(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  if (chu(form, 'xacNhan') !== CAU_XAC_NHAN) {
    return { loi: `Gõ đúng câu "${CAU_XAC_NHAN}" thì mới xoá được.` };
  }

  const hang = await db.nguoiDung.findUnique({
    where: { id: nguoi.id }, select: { matKhauBam: true, vaiTro: true, xoaLuc: true },
  });
  if (!hang || hang.xoaLuc) return { loi: 'Tài khoản này không còn nữa.' };
  if (!(await khopMatKhau(chu(form, 'matKhau'), hang.matKhauBam))) {
    return { loi: 'Mật khẩu không đúng.' };
  }

  if (hang.vaiTro === 'QUAN_TRI') {
    const conLai = await db.nguoiDung.count({
      where: { vaiTro: 'QUAN_TRI', xoaLuc: null, id: { not: nguoi.id } },
    });
    if (conLai === 0) {
      return {
        loi: 'Bạn là quản trị viên cuối cùng. Cất quyền quản trị cho người khác trước đã, '
          + 'không thì cửa hàng còn lại không ai mở được khu quản trị.',
      };
    }
  }

  /*
   * MẬT KHẨU MỚI LÀ MỘT CHUỖI NGẪU NHIÊN KHÔNG AI BIẾT.
   *
   * Để nguyên mật khẩu cũ thì tài khoản vẫn đăng nhập được y như trước — coi
   * như chưa xoá gì. Mà để rỗng thì `khopMatKhau` gặp một chuỗi không phải bcrypt
   * và ném lỗi, kéo theo cả trang đăng nhập của MỌI người.
   */
  const khoaChet = await bamMatKhau(randomBytes(32).toString('hex'));

  try {
    await db.$transaction(async (tx) => {
      /*
       * Giữ lại đánh giá, chủ đề, lời đáp, lượt tải và phiếu hữu ích: chúng
       * hoặc là chữ của người khác đang dựa vào, hoặc là con số đã cộng sẵn
       * vào cột đếm của game. Xoá đi thì mấy cột đếm ấy lệch vĩnh viễn mà
       * không chỗ nào tự phát hiện ra.
       */
      await tx.phien.deleteMany({ where: { nguoiId: nguoi.id } });
      await tx.daLuu.deleteMany({ where: { nguoiId: nguoi.id } });
      await tx.thongBao.deleteMany({ where: { nguoiId: nguoi.id } });
      await tx.maXacMinh.deleteMany({ where: { nguoiId: nguoi.id } });
      await tx.donTacGia.deleteMany({ where: { nguoiId: nguoi.id } });

      await tx.nguoiDung.update({
        where: { id: nguoi.id },
        data: {
          email: emailDaXoa(nguoi.id),
          tenDangNhap: tenDangNhapDaXoa(nguoi.id),
          tenHienThi: TEN_DA_XOA,
          anh: null,
          matKhauBam: khoaChet,
          // Quyền đi theo con người, không đi theo hàng dữ liệu còn sót lại.
          vaiTro: 'THANH_VIEN',
          thuThongBao: false,
          tenTacGia: null,
          gioiThieuTacGia: null,
          xoaLuc: new Date(),
        },
        select: { id: true },
      });
    });
  } catch {
    return { loi: 'Không xoá được lúc này. Thử lại giúp mình nhé.' };
  }

  await dongPhien();
  revalidatePath('/', 'layout');
  redirect('/tam-biet');
}
