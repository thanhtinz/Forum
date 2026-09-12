import type { db } from '@/lib/db';

/**
 * Cộng lại dung lượng của một bản từ chính các tệp của nó.
 *
 * Bản nhiều tệp (JAR kèm JAD) thì con số người tải cần biết là TỔNG, vì họ sẽ
 * lấy hết. Cộng lại từ bảng chứ không cộng dồn tay: cộng dồn thì mỗi lần xoá
 * một tệp mà quên trừ là lệch vĩnh viễn.
 *
 * Để ở đây chứ không ở `viec.ts` vì cổng tải tệp lên cũng phải cộng lại, mà
 * `viec.ts` là tệp `'use server'` — mọi thứ export ra khỏi đó đều thành một
 * địa chỉ POST công khai, kể cả một phép cộng nội bộ như phép này.
 */
export async function tinhLaiDungLuongBan(tx: typeof db, banId: string) {
  const tep = await tx.tepTai.findMany({ where: { banId }, select: { dungLuong: true } });
  const co = tep.some((t) => t.dungLuong != null);
  const tong = tep.reduce((t, x) => t + (x.dungLuong ?? 0n), 0n);
  await tx.banTai.update({
    where: { id: banId },
    // Không tệp nào đo được thì để trống hẳn, đừng ghi 0 — "0 B" đọc ra là
    // tệp rỗng, còn để trống thì trang game giấu dòng ấy đi.
    data: { dungLuong: co ? tong : null },
    select: { id: true },
  });
}
