'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { banMessage, getActiveBan } from '@/lib/ban';
import { chotBeQuan, trungTen } from '@/lib/tu-tien';
import { gieoLinhCan, gieoThuocTinh, loiTenDao, timDao } from '@/lib/tu-tien-const';

/**
 * Vạn Đạo Tu Tiên — thao tác đổi dữ liệu.
 *
 * Mọi hàm export ở đây là một endpoint POST công khai, nên hàm nào cũng tự
 * kiểm quyền của chính nó. Không hàm nào được tin rằng trang gọi nó đã kiểm hộ.
 *
 * GDD mục 27: "Server authoritative. Client gửi intent; server kiểm tra điều
 * kiện, tính kết quả và ghi log." Nên bộ thuộc tính khởi đầu do MÁY CHỦ gieo —
 * trình duyệt không gửi lên một con số nào của nhân vật.
 */

export interface TienState {
  ok?: boolean;
  error?: string;
  /** Câu kể lại việc vừa làm. */
  ke?: string;
}

async function nguoiTu(): Promise<{ userId: string } | { error: string }> {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để bước vào đạo đồ.' };
  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'tu tiên') };
  return { userId };
}

function lamMoi(): void {
  revalidatePath('/tu-tien', 'layout');
}

/**
 * Tạo nhân vật.
 *
 * Trình duyệt chỉ gửi ĐẠO HIỆU và ĐẠO CHÍNH. Tám thuộc tính và linh căn do
 * máy chủ gieo ngay tại đây: cho trình duyệt gửi lên là mở đường cho một bộ
 * thuộc tính kịch trần mọi ô.
 */
export async function taoNhanVat(_prev: TienState, formData: FormData): Promise<TienState> {
  const me = await nguoiTu();
  if ('error' in me) return { error: me.error };

  const ten = String(formData.get('ten') ?? '').trim();
  const loi = loiTenDao(ten);
  if (loi) return { error: loi };

  const dao = timDao(String(formData.get('dao') ?? ''));
  if (!dao) return { error: 'Chọn một trong năm đạo đã.' };

  if (await db.tienNhanVat.count({ where: { userId: me.userId } })) {
    return { error: 'Bạn đã có nhân vật rồi.' };
  }
  if (await trungTen(ten)) return { error: 'Đạo hiệu này có người mang rồi.' };

  const bo = gieoThuocTinh();
  const linhCan = gieoLinhCan();

  try {
    await db.tienNhanVat.create({
      data: {
        userId: me.userId, ten, dao: dao.ma, linhCan,
        // Viết thẳng tám cột chứ không rải bằng `Object.fromEntries`: rải thì
        // TypeScript mất dấu và thiếu một cột cũng không ai kêu.
        canCot: bo.canCot ?? 0,
        ngoTinh: bo.ngoTinh ?? 0,
        daoTam: bo.daoTam ?? 0,
        khiVan: bo.khiVan ?? 0,
        thanHon: bo.thanHon ?? 0,
        khiHuyet: bo.khiHuyet ?? 0,
        satY: bo.satY ?? 0,
        huyetMach: bo.huyetMach ?? 0,
        // Mốc bế quan đặt NGAY LÚC TẠO, không để mặc định của cơ sở dữ liệu:
        // hai chỗ đặt mốc là có lúc lệch nhau vài giây, mà vài giây ấy là tu vi.
        tuLuyenTu: new Date(),
      },
      select: { id: true },
    });
  } catch {
    // Chen nhau ở `@@unique`: hai tab cùng bấm, hoặc trùng đạo hiệu.
    return { error: 'Không tạo được nhân vật. Có thể đạo hiệu vừa bị người khác lấy mất.' };
  }

  lamMoi();
  return { ok: true, ke: `${ten} bước vào ${dao.ten}.` };
}

/**
 * Nhận tu vi bế quan.
 *
 * Trang nào của game cũng gọi `chotBeQuan` lúc đọc, nên nút này thực ra chỉ để
 * người chơi bấm cho thấy con số nhảy. Vẫn phải tự kiểm quyền như mọi hàm khác.
 */
export async function nhanTuVi(_prev: TienState, _formData: FormData): Promise<TienState> {
  const me = await nguoiTu();
  if ('error' in me) return { error: me.error };

  const kq = await chotBeQuan(me.userId);
  if (!kq) return { ok: true, ke: 'Chưa gom thêm được tu vi nào.' };

  lamMoi();
  const phan = [`Bế quan xong, thu về ${kq.nhan.toLocaleString('vi')} tu vi.`];
  if (kq.canhGioiMoi) phan.push(`Lên ${kq.canhGioiMoi}!`);
  if (kq.chanDotPha) phan.push('Tu vi đã đầy — muốn qua bậc mới thì phải độ kiếp.');
  return { ok: true, ke: phan.join(' ') };
}
