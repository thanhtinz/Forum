import nodemailer, { type Transporter } from 'nodemailer';
import { docThu } from '@/lib/cai-dat';

/*
 * GỬI THƯ.
 *
 * VÌ SAO CÓ TỆP NÀY: cửa hàng xưa nay không gửi được một lá thư nào, nên ai
 * quên mật khẩu phải xin ban quản trị phát mã rồi trao tay. Cách ấy vẫn giữ
 * (xem `phatMaDatLai`), nhưng nó chỉ chạy trong giờ có người trực.
 *
 * TẮT ĐƯỢC, VÀ TẮT THÌ PHẢI NÓI RA. Không khai đủ bốn biến môi trường thì hàm
 * `thuBat()` trả về false, và nơi gọi bày lối thủ công thay vì bày một ô nhập
 * bấm vào chẳng có gì xảy ra. Đây là chỗ dễ sai nhất của mọi phần gửi thư:
 * cấu hình thiếu mà giao diện vẫn nói "đã gửi rồi nhé", người dùng ngồi đợi
 * một lá thư không bao giờ tới.
 *
 * TÊN BIẾN MÔI TRƯỜNG BẰNG TIẾNG VIỆT, theo lệ của cả dự án. Đây là chỗ dễ
 * thấy nhất nếu định lệch lệ ấy — mấy tên `SMTP_*` quen mắt hơn thật — nhưng
 * một dự án nửa Việt nửa Anh thì người mới phải đoán xem chỗ nào theo lệ nào.
 *
 * CẤU HÌNH NAY ĐỌC TỪ `cai-dat.ts`, tức là ưu tiên thứ ban quản trị đã lưu rồi
 * mới lùi về biến môi trường. Vì thế mọi hàm ở đây thành bất đồng bộ — kể cả
 * `thuBat()`, vốn chỉ là một phép so chuỗi.
 */

/** Có gửi được thư không. Thiếu một mẩu cấu hình là coi như tắt. */
export async function thuBat(): Promise<boolean> {
  const c = await docThu();
  return !!(c.mayChu && c.nguoi && c.matKhau && (c.tu || c.nguoi));
}

/*
 * Dựng một lần rồi dùng lại, VÀ DỰNG LẠI KHI CẤU HÌNH ĐỔI.
 *
 * `nodemailer` giữ sẵn nối kết trong bể của nó, nên dựng mới mỗi lá thư là bắt
 * tay TLS lại từ đầu mỗi lần — chậm, mà máy chủ thư thì hay đếm số lần nối kết
 * để chặn.
 *
 * Nhưng nay cấu hình sửa được từ khu quản trị, nên giữ mãi một cái xe là sửa
 * xong vẫn gửi bằng máy chủ cũ cho tới lần khởi động lại. Nhớ kèm cả CHỮ KÝ
 * của cấu hình: khác chữ ký là dựng xe mới.
 */
let xe: Transporter | null = null;
let chuKyXe = '';

async function layXe(): Promise<Transporter> {
  const c = await docThu();
  const cong = Number(c.cong || '587');
  const chuKy = `${c.mayChu}|${cong}|${c.nguoi}|${c.matKhau}`;

  if (!xe || chuKyXe !== chuKy) {
    xe = nodemailer.createTransport({
      host: c.mayChu,
      port: cong,
      // Cổng 465 là TLS ngay từ đầu; 587 và 25 thì bắt tay xong mới nâng cấp
      // lên TLS bằng STARTTLS. Đoán sai chỗ này là nối kết treo im, không báo
      // lỗi gì cho tới lúc hết giờ chờ.
      secure: cong === 465,
      auth: { user: c.nguoi, pass: c.matKhau },
    });
    chuKyXe = chuKy;
  }
  return xe;
}

export interface KetQuaThu { ok: boolean; loi?: string }

/**
 * Gửi một lá thư. KHÔNG bao giờ ném lỗi ra ngoài.
 *
 * Máy chủ thư nằm ngoài tầm với: nó hết chỗ, nó chặn, nó chậm — và không việc
 * nào ở đây đáng để vỡ cả một lượt yêu cầu vì thế. Nơi gọi nhận `ok` rồi tự
 * quyết nói gì với người dùng.
 */
export async function guiThu(thu: {
  toi: string;
  tieuDe: string;
  /** Bản chữ trần. BẮT BUỘC — máy đọc màn hình và mấy hòm thư cũ chỉ đọc được nó. */
  chu: string;
  html?: string;
}): Promise<KetQuaThu> {
  if (!(await thuBat())) return { ok: false, loi: 'Chưa khai cấu hình gửi thư.' };

  try {
    const c = await docThu();
    const xeGui = await layXe();
    await xeGui.sendMail({
      from: c.tu || c.nguoi,
      to: thu.toi,
      subject: thu.tieuDe,
      text: thu.chu,
      html: thu.html,
    });
    return { ok: true };
  } catch (e) {
    // In ra nhật ký máy chủ chứ không trả nguyên văn về trình duyệt: câu lỗi
    // của máy chủ thư hay kèm tên máy và tên tài khoản gửi.
    console.error('[gui-thu] gửi hỏng:', e);
    return { ok: false, loi: 'Máy chủ thư không nhận.' };
  }
}
