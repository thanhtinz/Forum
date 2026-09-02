'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { banMessage, getActiveBan } from '@/lib/ban';
import { boCua, chotBeQuan, trungTen, type KeLaiKiep, type KeLaiTran } from '@/lib/tu-tien';
import {
  BAC_TOI_DA, DIA_DIEM_DAU, PHAT_DO_KIEP, PHAT_THUA, danhQuai, doKiep,
  gieoLinhCan, gieoThuocTinh, gomChuanBi, hpHienGio, keNhau, laDotPha,
  loiTenDao, sucChien, tenCanhGioi, timDao, timDiaDiem, timQuai, timThienKiep,
  tuViCanDe,
} from '@/lib/tu-tien-const';

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
  /** Trận vừa đánh, đủ để dựng lại nhật ký trên màn hình. */
  tran?: KeLaiTran;
  /** Lần độ kiếp vừa rồi, đủ để dựng màn kết quả. */
  kiep?: KeLaiKiep;
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
        // Vào cửa là ĐẦY MÁU. Cột `hp` mặc định 0 ở lược đồ, mà máu hồi theo
        // giờ nên để nguyên mặc định thì nhân vật mới toanh đứng ở 0/69 và
        // phải chờ mấy tiếng mới đánh được con quái đầu tiên — không ai hiểu
        // nổi vì sao. `hpTinhAt` đặt cùng lúc, cùng lý do với `tuLuyenTu`.
        hp: sucChien(bo, dao.ma, 1, 1).hpToiDa,
        hpTinhAt: new Date(),
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

// ─────────────────────────── Đi lại ───────────────────────────

/**
 * Sang ô kề bên.
 *
 * Trình duyệt gửi lên mã ô muốn tới, còn CHUYỆN HAI Ô CÓ KỀ NHAU KHÔNG thì
 * máy chủ tự xét: bản đồ là một lưới, mà lưới thì nhảy cóc rất dễ — gửi thẳng
 * mã đỉnh núi lúc đang đứng ở chân núi là đi hết cả bản đồ trong một lượt.
 */
export async function diChuyen(_prev: TienState, formData: FormData): Promise<TienState> {
  const me = await nguoiTu();
  if ('error' in me) return { error: me.error };

  const den = String(formData.get('den') ?? '');
  if (!timDiaDiem(den)) return { error: 'Không có nơi nào như vậy.' };

  const nv = await db.tienNhanVat.findUnique({
    where: { userId: me.userId }, select: { id: true, viTri: true },
  });
  if (!nv) return { error: 'Bạn chưa lập đạo hiệu.' };
  if (nv.viTri === den) return { ok: true };
  if (!keNhau(nv.viTri, den)) return { error: 'Chỗ ấy không đi thẳng từ đây được.' };

  // Ô cũ nằm trong `where`: hai tab cùng bấm thì tab sau không khớp, và người
  // chơi không đi được hai bước bằng một lượt.
  const xong = await db.tienNhanVat.updateMany({
    where: { id: nv.id, viTri: nv.viTri },
    data: { viTri: den },
  });
  if (xong.count === 0) return { error: 'Bạn vừa đi chỗ khác rồi.' };

  lamMoi();
  return { ok: true, ke: `Tới ${timDiaDiem(den)!.ten}.` };
}

// ─────────────────────────── Đánh quái ───────────────────────────

/**
 * Đánh một con quái ở ngay ô đang đứng.
 *
 * Máy chủ xử cả trận rồi trả về nhật ký; trình duyệt không mô phỏng gì cả, nó
 * chỉ đọc lại. Đây là hình thức của cả hai dòng game mà bản thiết kế dựa vào,
 * và cũng là điều GDD mục 14 chốt: "Server authoritative; client chỉ gửi hành
 * động."
 *
 * Ba chốt:
 *  • Con quái phải CÓ MẶT Ở Ô ẤY — gửi mã Thiết Bí Hùng lúc đang đứng ở rừng
 *    trúc thì bị chặn, không thì cứ đứng một chỗ mà đánh con thưởng cao nhất.
 *  • Máu trừ TRƯỚC bằng câu ghi mang mốc cũ, nên hai tab cùng bấm thì tab sau
 *    không đánh được ké một trận miễn phí.
 *  • Thua thì mất một phần tu vi và bị đưa về đầu bản đồ, nhưng KHÔNG mất
 *    nhân vật — GDD mục 7 chốt đúng thế.
 */
export async function danhNhau(_prev: TienState, formData: FormData): Promise<TienState> {
  const me = await nguoiTu();
  if ('error' in me) return { error: me.error };

  const maQuai = String(formData.get('quai') ?? '');
  const quai = timQuai(maQuai);
  if (!quai) return { error: 'Không có con nào như vậy.' };

  let ke = '';
  let keLai: KeLaiTran | undefined;

  try {
    await db.$transaction(async (tx) => {
      const r = await tx.tienNhanVat.findUnique({
        where: { userId: me.userId },
        select: {
          id: true, ten: true, dao: true, bac: true, tang: true, tuVi: true,
          linhThach: true, viTri: true, hp: true, hpTinhAt: true,
          canCot: true, ngoTinh: true, daoTam: true, khiVan: true,
          thanHon: true, khiHuyet: true, satY: true, huyetMach: true,
        },
      });
      if (!r) throw new Error('Bạn chưa lập đạo hiệu.');

      const o = timDiaDiem(r.viTri);
      if (!o || !o.quai.includes(maQuai)) {
        throw new Error(`Ở ${o?.ten ?? 'đây'} không có ${quai.ten}.`);
      }

      const now = Date.now();
      const suc = sucChien(boCua(r as never), r.dao, r.bac, r.tang);
      const hp = hpHienGio(r.hp, suc.hpToiDa, r.hpTinhAt.getTime(), now);
      if (hp <= 1) throw new Error('Thương thế còn nặng, nghỉ cho lại sức đã.');

      const kq = danhQuai(suc, hp, quai, r.dao);

      keLai = {
        dienBien: kq.dienBien,
        thang: kq.thang,
        tenTa: r.ten,
        tenDich: quai.ten,
        hpToiDa: suc.hpToiDa,
        hpDichDau: quai.hp,
        tuVi: 0,
        linhThach: 0,
      };

      if (kq.thang) {
        await tx.tienNhanVat.updateMany({
          where: { id: r.id, hpTinhAt: r.hpTinhAt },
          data: {
            hp: kq.hpConLai, hpTinhAt: new Date(now),
            tuVi: { increment: quai.tuVi },
            linhThach: { increment: quai.linhThach },
          },
        });
        keLai.tuVi = quai.tuVi;
        keLai.linhThach = quai.linhThach;
        ke = `Hạ được ${quai.ten}: +${quai.tuVi} tu vi, +${quai.linhThach} linh thạch.`;
        return;
      }

      // Thua: thương thế và mất một phần tu vi, bị đưa về đầu bản đồ. Không
      // mất nhân vật — GDD mục 7.
      const mat = Math.floor(r.tuVi * PHAT_THUA);
      await tx.tienNhanVat.updateMany({
        where: { id: r.id, hpTinhAt: r.hpTinhAt },
        data: {
          hp: 1, hpTinhAt: new Date(now),
          tuVi: Math.max(0, r.tuVi - mat),
          viTri: DIA_DIEM_DAU,
        },
      });
      keLai.tuVi = -mat;
      ke = `Thua ${quai.ten}. Mất ${mat} tu vi, được người ta khiêng về ${timDiaDiem(DIA_DIEM_DAU)?.ten}.`;
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không đánh được.' };
  }

  lamMoi();
  return { ok: true, ke, tran: keLai };
}

/**
 * Độ kiếp — đột phá qua bậc cảnh giới mới.
 *
 * Đây là hành động đắt nhất trong game nên cũng là chỗ chặt nhất:
 *
 *   • Trình duyệt CHỈ gửi lên danh sách MÃ món chuẩn bị. Giá, tác dụng và tỉ
 *     lệ đều đọc ở máy chủ từ `CHUAN_BI` — gửi kèm một cái giá 0 lên đây thì
 *     cũng không ai đọc.
 *   • Ghi CÓ ĐIỀU KIỆN: `where` mang theo bậc, tầng, tu vi, mốc máu cũ và
 *     `linhThach: { gte: gia }`. Hai tab cùng bấm thì tab sau đếm được 0 hàng
 *     và không có gì xảy ra — không có chuyện độ kiếp hai lần bằng một lượt
 *     tu vi, cũng không có chuyện tiêu âm linh thạch.
 *   • Trừ tiền bằng `decrement` chứ không ghi đè một con số đọc trước đó.
 */
export async function doThienKiep(_prev: TienState, fd: FormData): Promise<TienState> {
  const me = await nguoiTu();
  if ('error' in me) return me;

  // Mốc bế quan phải chốt TRƯỚC: người ngồi bế quan đủ tu vi rồi mở thẳng
  // trang này thì tu vi còn nằm ở dạng "chờ nhận", chưa vào sổ.
  await chotBeQuan(me.userId);

  const maChuanBi = String(fd.get('chuanBi') ?? '')
    .split(',').map((x) => x.trim()).filter(Boolean);
  const { gia } = gomChuanBi(maChuanBi);

  const r = await db.tienNhanVat.findUnique({
    where: { userId: me.userId },
    select: {
      id: true, dao: true, bac: true, tang: true, tuVi: true, linhThach: true,
      hp: true, hpTinhAt: true,
      canCot: true, ngoTinh: true, daoTam: true, khiVan: true,
      thanHon: true, khiHuyet: true, satY: true, huyetMach: true,
    },
  });
  if (!r) return { error: 'Chưa có nhân vật nào.' };

  if (!laDotPha(r.tang)) return { error: 'Chưa tới tầng Viên mãn, chưa có kiếp nào để độ.' };
  if (r.bac >= BAC_TOI_DA) return { error: 'Đã tới trần cảnh giới của giai đoạn này.' };
  if (r.tuVi < tuViCanDe(r.bac, r.tang)) return { error: 'Tu vi chưa đầy tầng Viên mãn.' };
  if (r.linhThach < gia) return { error: 'Không đủ linh thạch cho món đã chọn.' };

  const k = timThienKiep(r.bac);
  if (!k) return { error: 'Bậc này chưa có thiên kiếp.' };

  const bo = boCua(r as never);
  const suc = sucChien(bo, r.dao, r.bac, r.tang);
  const now = Date.now();
  const hp = hpHienGio(r.hp, suc.hpToiDa, r.hpTinhAt.getTime(), now);
  if (hp <= 1) return { error: 'Thương thế còn nặng, ngồi vào là chết chắc.' };

  const kq = doKiep(bo, suc, hp, r.bac, maChuanBi);
  const keChung = {
    ten: k.ten, soDao: k.soDao, dienBien: kq.dienBien, qua: kq.qua,
    hong: kq.hong, nguyenNhan: kq.nguyenNhan, hpDau: hp, hpToiDa: suc.hpToiDa,
    tonLinhThach: gia,
  };

  if (kq.qua) {
    const bacMoi = r.bac + 1;
    const n = await db.tienNhanVat.updateMany({
      where: {
        id: r.id, bac: r.bac, tang: r.tang, tuVi: r.tuVi,
        hpTinhAt: r.hpTinhAt, linhThach: { gte: gia },
      },
      data: {
        bac: bacMoi, tang: 1, tuVi: 0,
        hp: kq.hpConLai, hpTinhAt: new Date(now),
        // Mốc bế quan đặt lại: quãng trước cửa đột phá đã chốt xong rồi, để
        // nguyên là vừa lên bậc đã có sẵn một bình tu vi đầy.
        tuLuyenTu: new Date(now),
        linhThach: { decrement: gia },
      },
    });
    if (n.count === 0) return { error: 'Có thao tác khác vừa chen vào, thử lại.' };
    lamMoi();
    return {
      ok: true,
      kiep: { ...keChung, canhGioiMoi: tenCanhGioi(bacMoi, 1, r.dao), matTuVi: 0 },
    };
  }

  const mat = Math.floor(r.tuVi * PHAT_DO_KIEP);
  const n = await db.tienNhanVat.updateMany({
    where: {
      id: r.id, bac: r.bac, tang: r.tang, tuVi: r.tuVi,
      hpTinhAt: r.hpTinhAt, linhThach: { gte: gia },
    },
    data: {
      tuVi: r.tuVi - mat,
      hp: Math.max(1, kq.hpConLai), hpTinhAt: new Date(now),
      tuLuyenTu: new Date(now),
      linhThach: { decrement: gia },
    },
  });
  if (n.count === 0) return { error: 'Có thao tác khác vừa chen vào, thử lại.' };
  lamMoi();
  return { kiep: { ...keChung, canhGioiMoi: null, matTuVi: mat } };
}
