import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { dauNgayVN } from '@/lib/ngay-vn-const';

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

    /*
     * Ô ĐẾM CỦA NGÀY HÔM NAY — nằm trong cùng giao dịch với bộ đếm tổng.
     *
     * Để ngoài giao dịch thì có lúc tổng cộng một mà ngày không cộng, và hai
     * con số lệch nhau vĩnh viễn mà không chỗ nào phát hiện. Đếm cả lượt của
     * khách vãng lai: người ta tải thật thì đó là một lượt thật, dù không đăng
     * nhập.
     */
    const ngay = dauNgayVN();
    await tx.luotTaiNgay.upsert({
      where: { gameId_ngay_heMay: { gameId, ngay, heMay: heMay as 'JAVA' } },
      update: { so: { increment: 1 } },
      create: { gameId, ngay, heMay: heMay as 'JAVA', so: 1 },
      select: { so: true },
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
