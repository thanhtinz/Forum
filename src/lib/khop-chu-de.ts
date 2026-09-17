import type { Prisma } from '@prisma/client';

/**
 * Khớp lại hai cột đếm sẵn của một chủ đề sau khi bảng `TraLoi` đổi.
 *
 * `soTraLoi` và `traLoiCuoiLuc` đều là bản chép sẵn của những thứ vốn tính
 * được từ bảng lời đáp. Giữ chúng đúng là việc của MỌI chỗ ghi vào bảng ấy,
 * mà "mọi chỗ" thì có ba: người viết bài, người tự xoá bài mình, và ban quản
 * trị gỡ bài. Ba bản chép rời thì sớm muộn có một bản quên mất một cột — đã
 * quên đúng một lần rồi, và cột bị quên là `traLoiCuoiLuc`.
 *
 * ĐẾM LẠI TỪ BẢNG, không cộng trừ dần: trừ tay thì mỗi lần lệch là lệch vĩnh
 * viễn và không có chỗ nào phát hiện ra. Ở cỡ một chủ đề vài chục lời đáp thì
 * đếm lại rẻ hơn nhiều so với một con số sai không ai sửa được.
 *
 * Hết sạch lời đáp thì mốc quay về NGÀY MỞ CHỦ ĐỀ, không để nguyên mốc cũ:
 * `traLoiCuoiLuc` là khoá sắp của cả bảng chủ đề, nên một chủ đề trống mang
 * mốc của lời đáp vừa bị gỡ sẽ nằm lì trên đầu diễn đàn mãi.
 *
 * Gọi TRONG CÙNG giao dịch với lần ghi bảng `TraLoi` — ngoài giao dịch thì
 * giữa hai bước có một khe hở đủ cho lượt ghi khác chen vào.
 */
export async function khopLaiChuDe(tx: Prisma.TransactionClient, chuDeId: string) {
  const chuDe = await tx.chuDe.findUnique({
    where: { id: chuDeId }, select: { taoLuc: true },
  });
  if (!chuDe) return;

  const [con, cuoi] = await Promise.all([
    tx.traLoi.count({ where: { chuDeId } }),
    tx.traLoi.findFirst({
      where: { chuDeId },
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      select: { taoLuc: true },
    }),
  ]);

  await tx.chuDe.update({
    where: { id: chuDeId },
    data: { soTraLoi: con, traLoiCuoiLuc: cuoi?.taoLuc ?? chuDe.taoLuc },
    select: { id: true },
  });
}
