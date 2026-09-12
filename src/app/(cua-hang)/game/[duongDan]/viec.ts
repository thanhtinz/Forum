'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap } from '@/lib/xac-thuc';

export interface KetQua { ok?: boolean; loi?: string }

/**
 * Chấm sao và viết đánh giá. Chấm lại là SỬA bài cũ, không đẻ bài mới.
 *
 * `Game.tongSao` và `Game.soLuotDanhGia` phải khớp lại sau mỗi lần ghi. Cộng
 * dồn thủ công (`tongSao += sao`) thì lúc người ta sửa từ 5 xuống 2 là con số
 * lệch vĩnh viễn, mà không có chỗ nào phát hiện ra. Nên đếm lại từ chính bảng
 * đánh giá, trong CÙNG một giao dịch với lần ghi — đó là thứ luôn đúng.
 */
export async function chamSao(gameId: string, sao: number, noiDung: string): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để đánh giá.' }; }

  if (!Number.isInteger(sao) || sao < 1 || sao > 5) return { loi: 'Hãy chọn từ 1 đến 5 sao.' };

  const chu = noiDung.trim().slice(0, 2000);

  const game = await db.game.findFirst({
    where: { id: gameId, trangThai: 'DANG_HIEN' },
    select: { duongDan: true },
  });
  if (!game) return { loi: 'Không tìm thấy game này.' };

  await db.$transaction(async (tx) => {
    await tx.danhGia.upsert({
      where: { gameId_nguoiId: { gameId, nguoiId: nguoi.id } },
      update: { sao, noiDung: chu || null },
      create: { gameId, nguoiId: nguoi.id, sao, noiDung: chu || null },
      select: { id: true },
    });

    const gom = await tx.danhGia.aggregate({
      where: { gameId }, _sum: { sao: true }, _count: { _all: true },
    });
    await tx.game.update({
      where: { id: gameId },
      data: { tongSao: gom._sum.sao ?? 0, soLuotDanhGia: gom._count._all },
      select: { id: true },
    });
  });

  revalidatePath(`/game/${game.duongDan}`);
  return { ok: true };
}

/* ──────────────────────────────────────────────────────────────────────────
 * ĐỌC ĐÁNH GIÁ THEO TRANG — cho tấm trượt "tất cả đánh giá"
 *
 * Trang game chỉ bày năm bài mới nhất. Bấm "Xem tất cả" thì mở một tấm trượt
 * đọc tiếp từ đây, chứ không rời trang: người đang cân nhắc tải rất hay đọc
 * vài bài rồi quay lại nhìn nút tải, mà rời trang thì mất chỗ đang đứng.
 *
 * Đây là hàm ĐỌC công khai, và nó cố ý không kiểm quyền: đánh giá của một game
 * đang bày bán thì ai cũng đọc được, y như trên trang. Nhưng điều kiện "game
 * đang hiện" vẫn nằm trong `where` — game đã gỡ thì không được rò ra qua đây.
 * ────────────────────────────────────────────────────────────────────────── */

/* Không `export`: tệp `'use server'` chỉ cho phép export hàm bất đồng bộ, và
   con số này không ai ngoài tệp cần. */
const MOI_TRANG_DANH_GIA = 20;

export interface BaiXem {
  id: string;
  sao: number;
  noiDung: string | null;
  taoLuc: Date;
  traLoi: string | null;
  traLoiLuc: Date | null;
  nguoiId: string;
  nguoi: { tenHienThi: string; tenDangNhap: string; anh: string | null };
}

export interface TrangDanhGia {
  bai: BaiXem[];
  /** Tổng số bài KHỚP bộ lọc — để biết còn gì mà tải thêm không. */
  tong: number;
}

const CACH_SAP = {
  moi: [{ taoLuc: 'desc' as const }, { id: 'desc' as const }],
  cao: [{ sao: 'desc' as const }, { taoLuc: 'desc' as const }, { id: 'desc' as const }],
  thap: [{ sao: 'asc' as const }, { taoLuc: 'desc' as const }, { id: 'desc' as const }],
};

export async function layDanhGia(
  gameId: string,
  loc: { sao?: number | null; sap?: string; trang?: number },
): Promise<TrangDanhGia> {
  // Mọi tham số đều do trình duyệt gửi lên, nên ép hết về khoảng cho phép —
  // `trang: 1e9` mà lọt vào `skip` là một lượt quét bảng không đáng có.
  const sao = Number.isInteger(loc.sao) && loc.sao! >= 1 && loc.sao! <= 5 ? loc.sao! : null;
  const theo = CACH_SAP[(loc.sap ?? 'moi') as keyof typeof CACH_SAP] ?? CACH_SAP.moi;
  const trang = Math.min(200, Math.max(1, Math.floor(Number(loc.trang) || 1)));

  const where = {
    gameId,
    game: { trangThai: 'DANG_HIEN' as const },
    ...(sao ? { sao } : {}),
  };

  const [bai, tong] = await Promise.all([
    db.danhGia.findMany({
      where,
      orderBy: theo,
      skip: (trang - 1) * MOI_TRANG_DANH_GIA,
      take: MOI_TRANG_DANH_GIA,
      select: {
        id: true, sao: true, noiDung: true, taoLuc: true, traLoi: true, traLoiLuc: true,
        nguoiId: true,
        nguoi: { select: { tenHienThi: true, tenDangNhap: true, anh: true } },
      },
    }),
    db.danhGia.count({ where }),
  ]);

  return { bai, tong };
}
