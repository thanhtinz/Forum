import { db } from '@/lib/db';
import type { LoaiThongBao } from '@prisma/client';
import { guiThu, thuBat } from '@/lib/gui-thu';
import { DIA_CHI_GOC } from '@/lib/dia-chi-goc';

/**
 * Gửi một thông báo, và KHÔNG BAO GIỜ làm hỏng việc chính vì nó.
 *
 * Mọi chỗ gọi hàm này đều đang làm dở một việc quan trọng hơn: đăng một lời
 * đáp, trả lời một đánh giá, gỡ một bài rác. Nếu lượt ghi thông báo hỏng —
 * CSDL nghẽn, cột nào đó đổi — thì thà mất cái thông báo còn hơn để cả việc
 * chính đổ theo. Nên bắt hết lỗi tại đây, và cố ý KHÔNG gọi trong cùng giao
 * dịch với việc chính.
 *
 * Không tự gửi cho chính mình: trả lời chủ đề của chính mình rồi nhận thông
 * báo "có người trả lời bạn" là thứ làm người ta thôi tin vào cái chuông.
 */
export async function guiThongBao(viec: {
  nguoiNhanId: string;
  nguoiGayRaId?: string;
  loai: LoaiThongBao;
  tieuDe: string;
  chiTiet?: string | null;
  duongDan?: string | null;
}): Promise<void> {
  if (viec.nguoiGayRaId && viec.nguoiGayRaId === viec.nguoiNhanId) return;

  try {
    await db.thongBao.create({
      data: {
        nguoiId: viec.nguoiNhanId,
        loai: viec.loai,
        tieuDe: viec.tieuDe.slice(0, 200),
        chiTiet: viec.chiTiet?.slice(0, 300) || null,
        duongDan: viec.duongDan || null,
      },
      select: { id: true },
    });
  } catch {
    // Nuốt lỗi có chủ ý — xem chú thích ở trên.
    return;
  }

  await baoQuaThu(viec);
}

/**
 * Báo cùng một chuyện ấy qua thư.
 *
 * TÁCH KHỎI LƯỢT GHI và chỉ chạy SAU khi ghi xong. Cái chuông trong trang là
 * thứ phải có; lá thư chỉ là thứ nên có. Gộp chung thì máy chủ thư chậm một
 * nhịp là cả việc đăng bài chậm theo, mà máy chủ thư thì chậm thật.
 *
 * Cũng nuốt sạch lỗi, cùng lẽ với lượt ghi: không việc nào ở đây đáng để vỡ cả
 * một lượt yêu cầu.
 */
async function baoQuaThu(viec: {
  nguoiNhanId: string;
  tieuDe: string;
  chiTiet?: string | null;
  duongDan?: string | null;
}): Promise<void> {
  if (!(await thuBat())) return;

  try {
    /*
     * Hỏi công tắc của người nhận NGAY TRONG `where`.
     *
     * Lấy người rồi mới xét `thuThongBao` thì chỉ cần quên một câu `if` là thư
     * bay tới người đã tắt — mà đó đúng là kiểu lỗi khiến người ta chặn luôn
     * tên miền của cửa hàng.
     */
    const nguoi = await db.nguoiDung.findFirst({
      where: { id: viec.nguoiNhanId, thuThongBao: true, khoa: false },
      select: { email: true, tenHienThi: true },
    });
    if (!nguoi) return;

    const dich = viec.duongDan ? `${DIA_CHI_GOC}${viec.duongDan}` : `${DIA_CHI_GOC}/thong-bao`;

    await guiThu({
      toi: nguoi.email,
      tieuDe: viec.tieuDe.slice(0, 200),
      chu: [
        `Chào ${nguoi.tenHienThi},`,
        '',
        viec.tieuDe,
        ...(viec.chiTiet ? ['', viec.chiTiet] : []),
        '',
        dich,
        '',
        '—',
        'Không muốn nhận thư kiểu này nữa? Tắt ở đây:',
        `${DIA_CHI_GOC}/toi/cai-dat`,
        '',
        'SunnyStore',
      ].join('\n'),
    });
  } catch {
    // Thư hỏng thì thôi. Thông báo trong trang đã ghi xong từ trước rồi.
  }
}

/** Đếm thông báo chưa đọc, cho con số trên chuông. */
export async function demChuaDoc(nguoiId: string): Promise<number> {
  return db.thongBao.count({ where: { nguoiId, daDoc: false } });
}
