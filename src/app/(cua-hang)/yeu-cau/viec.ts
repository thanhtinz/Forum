'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap } from '@/lib/xac-thuc';

export interface KetQua { loi?: string }

/** Trần số yêu cầu mỗi người mỗi ngày — chặn một người gửi cả trăm dòng. */
const MOI_NGAY = 5;

export async function guiYeuCau(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để gửi yêu cầu.' }; }

  const ten = String(form.get('ten') ?? '').trim();
  const ghiChu = String(form.get('ghiChu') ?? '').trim().slice(0, 1000);

  if (ten.length < 2) return { loi: 'Hãy cho biết tên game bạn cần.' };
  if (ten.length > 150) return { loi: 'Tên game dài quá, viết ngắn lại giúp nhé.' };

  const tuLuc = new Date(Date.now() - 24 * 3600 * 1000);
  const daGui = await db.yeuCau.count({ where: { nguoiId: nguoi.id, taoLuc: { gte: tuLuc } } });
  if (daGui >= MOI_NGAY) {
    return { loi: `Mỗi ngày gửi tối đa ${MOI_NGAY} yêu cầu. Mai bạn quay lại nhé.` };
  }

  await db.yeuCau.create({
    data: { nguoiId: nguoi.id, ten, ghiChu: ghiChu || null },
    select: { id: true },
  });

  revalidatePath('/yeu-cau');
  return {};
}
