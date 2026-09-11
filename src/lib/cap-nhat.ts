import { db } from './db';
import { CHON_THE, thanhThe, type TheGame } from '@/components/game/the-game';
import type { MaHeMay } from './he-may';

/*
 * "CÓ BẢN CẬP NHẬT" — game trong thư viện đã có bản mới hơn bản đã tải.
 *
 * Đây là mục CH Play để ở "Quản lý ứng dụng", và ở một cửa hàng game cũ thì
 * nó còn đáng giá hơn: người ta tải một bản JAR về máy rồi để đấy hàng tháng,
 * không có cách nào biết bản vá lỗi treo máy đã ra.
 *
 * Không cần thêm bảng nào: `LuotTai` vốn đã ghi hệ máy và số hiệu bản đã tải.
 */

export interface CoBanMoi {
  game: TheGame;
  heMay: MaHeMay;
  /** Bản người ta đang có trong máy. */
  banCu: string;
  /** Bản mới nhất của đúng hệ máy ấy. */
  banMoi: string;
  /** Có gì mới ở bản mới — để người dùng tự quyết có đáng tải lại không. */
  doiMoi: string | null;
  ngayRa: Date | null;
}

/**
 * Danh sách game có bản mới của một người.
 *
 * SO SÁNH BẰNG CỜ `moiNhat`, KHÔNG PHẢI BẰNG SỐ HIỆU.
 *
 * So chuỗi thì "1.10" nhỏ hơn "1.9"; tách số ra mà so thì vấp mấy dãy kiểu
 * "2.0b" hay "1.0.2-vi" vốn đầy rẫy ở game cũ. Mỗi hệ máy đã có đúng một bản
 * mang cờ `moiNhat` (quản trị đặt, và có bài kiểm canh), nên chỉ cần hỏi:
 * bản đang có trong máy CÓ PHẢI bản mang cờ ấy không. Khác là có bản mới.
 *
 * Đánh đổi: người tải bản cũ rồi sau đó tải tiếp bản mới nhất thì hàng
 * `LuotTai` ghi bản mới — đúng, vì nó giữ lần tải GẦN NHẤT.
 */
export async function timBanMoi(nguoiId: string): Promise<CoBanMoi[]> {
  const daTai = await db.luotTai.findMany({
    where: { nguoiId, game: { trangThai: 'DANG_HIEN' } },
    orderBy: { lanCuoi: 'desc' },
    take: 200,
    select: {
      heMay: true, soHieu: true,
      game: {
        select: {
          ...CHON_THE,
          // Chỉ lấy bản MỚI NHẤT của mỗi hệ — không kéo cả lịch sử về chỉ để
          // so đúng một số hiệu.
          banTai: {
            where: { moiNhat: true },
            select: { heMay: true, soHieu: true, doiMoi: true, ngayRa: true },
          },
        },
      },
    },
  });

  const ra: CoBanMoi[] = [];
  for (const l of daTai) {
    // `banTai` ở đây đã bị lọc còn mỗi bản mới nhất, nên `CHON_THE.banTai`
    // (vốn dùng để liệt kê hệ máy trên thẻ) không dùng lại được — dựng thẻ
    // từ chính danh sách hệ máy của lượt tải này.
    const moiNhat = l.game.banTai.find((b) => b.heMay === l.heMay);
    if (!moiNhat) continue;
    if (!l.soHieu || l.soHieu === moiNhat.soHieu) continue;

    ra.push({
      game: thanhThe({ ...l.game, banTai: l.game.banTai }),
      heMay: l.heMay as MaHeMay,
      banCu: l.soHieu,
      banMoi: moiNhat.soHieu,
      doiMoi: moiNhat.doiMoi,
      ngayRa: moiNhat.ngayRa,
    });
  }
  return ra;
}

/** Chỉ đếm — dùng cho huy hiệu số, khỏi kéo cả danh sách về. */
export async function demBanMoi(nguoiId: string): Promise<number> {
  return (await timBanMoi(nguoiId)).length;
}
