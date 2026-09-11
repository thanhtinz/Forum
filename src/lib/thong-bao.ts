import { db } from '@/lib/db';
import type { LoaiThongBao } from '@prisma/client';

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
  }
}

/** Đếm thông báo chưa đọc, cho con số trên chuông. */
export async function demChuaDoc(nguoiId: string): Promise<number> {
  return db.thongBao.count({ where: { nguoiId, daDoc: false } });
}
