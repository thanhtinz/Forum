'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap } from '@/lib/xac-thuc';

export interface KetQua { loi?: string }

/**
 * Đánh dấu đã đọc HẾT.
 *
 * Điều kiện `nguoiId` nằm trong `where` của `updateMany`, nên dù ai gọi thẳng
 * vào địa chỉ này cũng chỉ đụng được thông báo của chính họ. Không có tham số
 * nào nhận từ trình duyệt cả — không có gì để bịa.
 */
export async function docHet(): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  await db.thongBao.updateMany({
    where: { nguoiId: nguoi.id, daDoc: false }, data: { daDoc: true },
  });

  revalidatePath('/thong-bao', 'layout');
  return {};
}

/** Xoá hết thông báo đã đọc, cho ai muốn dọn sạch danh sách. */
export async function xoaDaDoc(): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  await db.thongBao.deleteMany({ where: { nguoiId: nguoi.id, daDoc: true } });

  revalidatePath('/thong-bao', 'layout');
  return {};
}
