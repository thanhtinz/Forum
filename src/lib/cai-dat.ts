import { cache } from 'react';
import { db } from '@/lib/db';

/*
 * CẤU HÌNH SỬA ĐƯỢC TỪ KHU QUẢN TRỊ.
 *
 * Trước đợt này mọi cấu hình đều nằm trong biến môi trường: đổi địa chỉ thùng
 * ảnh hay đổi máy chủ thư là phải sửa `.env` rồi dựng lại cả trang. Trên máy
 * chủ thật thì đó là việc của người có quyền triển khai, mà người trông cửa
 * hàng thì thường không phải người ấy — nên trên thực tế cấu hình gần như
 * không bao giờ đổi được.
 *
 * BẢNG `CaiDat` VỐN ĐÃ CÓ TRONG LƯỢC ĐỒ mà chưa ai dùng. Nay nó có việc: mỗi
 * NHÓM cấu hình là một hàng, giá trị là một khối JSON. Gom theo nhóm chứ không
 * mỗi thiết lập một hàng vì cả nhóm luôn được đọc và ghi cùng nhau — một hàng
 * thì đọc một lượt, và ghi thì không bao giờ có cảnh nửa nhóm mới nửa nhóm cũ.
 *
 * BIẾN MÔI TRƯỜNG VẪN LÀ NỀN. Có giá trị trong cơ sở dữ liệu thì lấy giá trị
 * ấy, không thì lùi về biến môi trường. Thứ tự này quan trọng: máy vừa dựng
 * lên, cơ sở dữ liệu còn trống, mà `.env` đã khai đủ — thì cửa hàng phải chạy
 * được ngay chứ không đợi ai vào bấm Lưu.
 *
 * BÍ MẬT KHÔNG BAO GIỜ ĐI NGƯỢC RA TRÌNH DUYỆT. Trang quản trị chỉ nhận biết
 * "đã có" hay "chưa có"; ô nhập để trống nghĩa là GIỮ NGUYÊN cái đang có, chứ
 * không phải xoá đi. Xem `gopBiMat`.
 */

/** Tên hàng trong bảng `CaiDat`. */
export type NhomCaiDat = 'thu' | 'kho' | 'trang' | 'anh-dong';

export interface CaiDatThu {
  mayChu: string;
  cong: string;
  nguoi: string;
  matKhau: string;
  tu: string;
}

export interface CaiDatKho {
  taiKhoan: string;
  khoa: string;
  biMat: string;
  thung: string;
  diaChi: string;
}

/**
 * Dịch vụ ẢNH ĐỘNG cho bảng cảm xúc.
 *
 * `nhaCungCap` là `tenor` hoặc `giphy` — hai chỗ duy nhất có kho ảnh động đủ
 * lớn mà vẫn phát khoá miễn phí. Không dựng kho ảnh động của riêng cửa hàng:
 * thứ người ta muốn gửi là ảnh động của cả thế giới, mà giữ lấy nghĩa là giữ
 * luôn phần kiểm duyệt nội dung của cả thế giới ấy.
 */
export interface CaiDatAnhDong {
  nhaCungCap: string;
  khoaApi: string;
}

export interface CaiDatTrang {
  ten: string;
  moTa: string;
  emailLienHe: string;
}

/** Ô nào là bí mật — không in ra, và để trống thì giữ nguyên. */
export const O_BI_MAT: Record<NhomCaiDat, readonly string[]> = {
  thu: ['matKhau'],
  kho: ['biMat'],
  trang: [],
  'anh-dong': ['khoaApi'],
};

const NEN: {
  thu: CaiDatThu; kho: CaiDatKho; trang: CaiDatTrang; 'anh-dong': CaiDatAnhDong;
} = {
  thu: {
    mayChu: process.env.THU_MAY_CHU ?? '',
    cong: process.env.THU_CONG ?? '587',
    nguoi: process.env.THU_NGUOI ?? '',
    matKhau: process.env.THU_MAT_KHAU ?? '',
    tu: process.env.THU_TU ?? '',
  },
  kho: {
    taiKhoan: process.env.R2_TAI_KHOAN ?? '',
    khoa: process.env.R2_KHOA ?? '',
    biMat: process.env.R2_BI_MAT ?? '',
    thung: process.env.R2_THUNG ?? '',
    diaChi: (process.env.R2_DIA_CHI ?? '').replace(/\/+$/, ''),
  },
  'anh-dong': {
    nhaCungCap: process.env.GIF_NHA_CUNG_CAP ?? 'tenor',
    khoaApi: process.env.GIF_KHOA_API ?? '',
  },
  trang: {
    ten: 'SunnyStore',
    moTa: 'Cửa hàng tải game Java, Android, iOS — kèm khu diễn đàn cho từng game.',
    emailLienHe: '',
  },
};

/**
 * Đọc một nhóm cấu hình, đã trộn sẵn với nền từ biến môi trường.
 *
 * BỌC `cache` CỦA REACT — nhớ trong ĐÚNG MỘT LƯỢT DỰNG TRANG. Một lượt dựng có
 * thể hỏi tới cấu hình thư ở ba chỗ (bố cục, trang, rồi lúc gửi thông báo);
 * không bọc thì mỗi lượt xem trang là ba câu truy vấn y hệt nhau.
 *
 * Hỏng thì trả về NỀN chứ không ném lỗi: cơ sở dữ liệu chập chờn mà kéo theo
 * cả trang trắng thì tệ hơn nhiều so với việc chạy tạm bằng cấu hình trong
 * biến môi trường.
 */
export const docThu = cache(async (): Promise<CaiDatThu> => doc('thu'));
export const docKho = cache(async (): Promise<CaiDatKho> => doc('kho'));
export const docTrang = cache(async (): Promise<CaiDatTrang> => doc('trang'));
export const docAnhDong = cache(async (): Promise<CaiDatAnhDong> => doc('anh-dong'));

async function doc<T extends NhomCaiDat>(nhom: T): Promise<(typeof NEN)[T]> {
  try {
    const hang = await db.caiDat.findUnique({ where: { khoa: nhom }, select: { giaTri: true } });
    if (!hang?.giaTri || typeof hang.giaTri !== 'object') return NEN[nhom];

    const luu = hang.giaTri as Record<string, unknown>;
    const ra = { ...NEN[nhom] } as Record<string, string>;
    for (const [k, v] of Object.entries(luu)) {
      // Chỉ nhận chuỗi, và chỉ nhận khoá đã biết: hàng JSON này ai sửa thẳng
      // trong cơ sở dữ liệu cũng được, nên đừng tin nó nhét vào cái gì.
      if (typeof v === 'string' && v !== '' && k in ra) ra[k] = v;
    }
    return ra as unknown as (typeof NEN)[T];
  } catch {
    return NEN[nhom];
  }
}

/**
 * Ghi một nhóm, giữ nguyên ô bí mật để trống.
 *
 * Ô bí mật để trống nghĩa là "không đổi", không phải "xoá đi": trang quản trị
 * không bao giờ in mật khẩu ra, nên nếu để trống mà hiểu là xoá thì chỉ cần
 * bấm Lưu một lần là mất sạch cấu hình mà chẳng ai cố ý làm gì.
 *
 * Muốn xoá thật thì có ô đánh dấu riêng — xem `xoaBiMat`.
 */
export async function luuNhom(
  nhom: NhomCaiDat,
  moi: Record<string, string>,
  xoaBiMat: string[] = [],
): Promise<void> {
  const cu = await doc(nhom);
  const gop: Record<string, string> = { ...(cu as unknown as Record<string, string>) };

  for (const [k, v] of Object.entries(moi)) {
    if (!(k in gop)) continue;
    const laBiMat = O_BI_MAT[nhom].includes(k);
    if (laBiMat && v === '' && !xoaBiMat.includes(k)) continue;
    gop[k] = v;
  }
  for (const k of xoaBiMat) if (k in gop) gop[k] = '';

  await db.caiDat.upsert({
    where: { khoa: nhom },
    create: { khoa: nhom, giaTri: gop },
    update: { giaTri: gop },
    select: { khoa: true },
  });
}

/** Thiết lập này đang lấy từ đâu — để trang quản trị nói rõ cho người sửa. */
export async function nguonCua(
  nhom: NhomCaiDat,
): Promise<'kho-du-lieu' | 'bien-moi-truong' | 'mac-dinh' | 'trong'> {
  try {
    const hang = await db.caiDat.findUnique({ where: { khoa: nhom }, select: { giaTri: true } });
    if (hang?.giaTri && typeof hang.giaTri === 'object'
      && Object.values(hang.giaTri as Record<string, unknown>).some((v) => v)) {
      return 'kho-du-lieu';
    }
  } catch { /* hỏi không được thì coi như chưa có */ }

  // Tên và câu giới thiệu cửa hàng KHÔNG có biến môi trường nào — chúng lùi về
  // chữ chép sẵn trong `NEN`. Nói nhầm là "biến môi trường" thì người sửa đi
  // tìm một dòng `.env` không tồn tại.
  if (nhom === 'trang') return 'mac-dinh';

  /*
   * Nhóm ảnh động luôn có sẵn tên nhà cung cấp trong `NEN`, nên phép "có giá
   * trị nào khác rỗng không" ở dưới lúc nào cũng đúng — mà thứ quyết định
   * nhóm này đã cấu hình hay chưa CHỈ LÀ CÁI KHOÁ. Không tách riêng thì trang
   * quản trị báo "đang lấy từ biến môi trường" trong khi chẳng có khoá nào.
   */
  if (nhom === 'anh-dong') {
    return NEN['anh-dong'].khoaApi ? 'bien-moi-truong' : 'trong';
  }

  return Object.values(NEN[nhom]).some((v) => v) ? 'bien-moi-truong' : 'trong';
}
