import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';

/**
 * Ghi sổ một lượt tải: cộng bộ đếm của game, và ghi vào thư viện người tải.
 *
 * Để riêng vì có HAI lối tải cùng phải ghi đúng một sổ — lối đưa thẳng sang
 * tệp (`/api/tai/…`) và lối chảy qua máy chủ để vẽ thanh tiến trình
 * (`/api/tai/…/dong`). Chép phép ghi này ra hai chỗ là chuẩn bị sẵn cho ngày
 * hai chỗ đếm khác nhau, mà con số lượt tải thì cả trang chủ lẫn bảng xếp
 * hạng đều dựa vào.
 */
export async function ghiLuotTai(
  gameId: string, heMay: string, soHieu: string,
): Promise<void> {
  const nguoi = await nguoiHienTai();

  await db.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: gameId },
      data: { soLuotTai: { increment: 1 } },
      select: { id: true },
    });

    // Khách vãng lai vẫn tải được — chỉ là không có thư viện để ghi vào.
    if (nguoi) {
      await tx.luotTai.upsert({
        where: { gameId_nguoiId: { gameId, nguoiId: nguoi.id } },
        update: { heMay: heMay as 'JAVA', soHieu, lanCuoi: new Date(), soLan: { increment: 1 } },
        create: { gameId, nguoiId: nguoi.id, heMay: heMay as 'JAVA', soHieu },
        select: { id: true },
      });
    }
  });
}
