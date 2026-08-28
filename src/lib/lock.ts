import type { Prisma } from '@prisma/client';

/**
 * Khoá hàng người dùng trong một transaction.
 *
 * Dùng cho những thao tác mà luật nằm ở "đọc rồi mới ghi": đọc xem đã kết bạn
 * chưa rồi mới tạo hàng, đọc xem đã chấm uy tín trong 24 giờ chưa rồi mới ghi
 * phiếu. Hai lần bấm cùng lúc thì cả hai cùng đọc thấy "chưa có", cùng ghi, và
 * luật bị phá mà không ai làm gì sai. Khoá hàng người dùng bắt hai luồng ấy nối
 * đuôi nhau, luồng sau đọc được thứ luồng trước vừa ghi.
 *
 * Khoá lần lượt theo thứ tự id đã sắp: hai luồng khoá cùng một cặp người theo
 * hai thứ tự ngược nhau thì kẹt chết lẫn nhau.
 */
export async function lockUsers(tx: Prisma.TransactionClient, ...ids: string[]): Promise<void> {
  for (const id of [...new Set(ids)].sort()) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
  }
}
