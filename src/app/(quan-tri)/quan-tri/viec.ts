'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap, batBuocQuanTri } from '@/lib/xac-thuc';
import { thanhDuongDan } from '@/lib/tien-ich';
import { HE_MAY, laLoaiTep, type MaHeMay, type MaLoaiTep } from '@/lib/he-may';
import { guiThongBao } from '@/lib/thong-bao';
import { baoBanMoi } from '@/lib/bao-ban-moi';
import { dungChuDam } from '@/lib/chu-dam';
import { xoaAnh } from '@/lib/kho-anh';
import { LOI_KHONG_QUYEN, locGameCuaToi, quyenTrenGame } from '@/lib/quyen-game';
import { dungChuoiTim } from '@/lib/tim-kiem-const';
import { LOI_DIA_CHI, laDiaChiHopLe, laHttpsHopLe, xemDiaChi } from '@/lib/dia-chi-an-toan';

export interface KetQua { loi?: string; ok?: boolean }

function chu(form: FormData, ten: string): string {
  return String(form.get(ten) ?? '').trim();
}

/**
 * Thêm hoặc sửa một game.
 *
 * Mọi hàm export trong tệp `'use server'` là một địa chỉ POST CÔNG KHAI: ai
 * biết cách gọi đều gọi được, không đi qua khung `/quan-tri` nào cả. Nên câu
 * `batBuocQuanTri()` ở dòng đầu không phải thừa — nó là lớp chặn thật sự.
 */
export async function luuGame(_truoc: KetQua, form: FormData): Promise<KetQua> {
  const id = chu(form, 'id') || null;

  /*
   * SỬA thì phải là chủ game (hoặc ban quản trị); TẠO thì chỉ cần là tác giả.
   *
   * Hai phép kiểm khác nhau nên tách hẳn ra, chứ không gộp thành một câu `if`
   * — gộp lại là kiểu chỗ mà về sau ai đó thêm một nhánh rồi vô tình mở toang
   * lối tạo game cho thành viên thường.
   */
  let nguoi;
  try {
    if (id) {
      nguoi = (await quyenTrenGame(id)).nguoi;
    } else {
      nguoi = await batBuocDangNhap();
      if (nguoi.vaiTro !== 'QUAN_TRI' && nguoi.vaiTro !== 'TAC_GIA') {
        throw new Error('khong-phai-tac-gia');
      }
    }
  } catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const laQuanTri = nguoi.vaiTro === 'QUAN_TRI';

  const ten = chu(form, 'ten');
  if (ten.length < 2) return { loi: 'Hãy nhập tên game.' };

  const duongDanNhap = chu(form, 'duongDan');
  const duongDan = thanhDuongDan(duongDanNhap || ten);
  if (!duongDan) return { loi: 'Tên game không tạo được đường dẫn hợp lệ.' };

  // Đường dẫn là thứ nằm trên URL nên phải là duy nhất. Kiểm trước để báo một
  // câu người đọc hiểu được, thay vì để ràng buộc của CSDL ném ra lỗi thô.
  const trung = await db.game.findFirst({
    where: { duongDan, ...(id ? { NOT: { id } } : {}) }, select: { id: true },
  });
  if (trung) return { loi: `Đường dẫn “${duongDan}” đã có game khác dùng.` };

  // Ảnh biểu tượng trước đây nhận bất cứ chuỗi gì — kể cả `javascript:`.
  const icon = chu(form, 'icon');
  if (icon && !laDiaChiHopLe(icon)) return { loi: LOI_DIA_CHI };

  const namRaw = parseInt(chu(form, 'namPhatHanh'), 10);
  const duLieu = {
    duongDan,
    ten,
    tenViet: chu(form, 'tenViet') || null,
    nhaPhatTrien: chu(form, 'nhaPhatTrien') || null,
    namPhatHanh: Number.isFinite(namRaw) && namRaw > 1970 && namRaw < 2100 ? namRaw : null,
    gioiThieu: chu(form, 'gioiThieu') || null,
    icon: icon || null,
    ngonNgu: chu(form, 'ngonNgu') || 'en',
    vietHoa: form.get('vietHoa') === 'on',
    /*
     * "Đưa lên băng nổi bật" là chỗ của BAN QUẢN TRỊ, không phải của tác giả.
     * Nó quyết định game nào chiếm mặt tiền, nên để tác giả tự bật là ai cũng
     * tự đưa mình lên đầu trang. Tác giả gửi lên cờ này thì bỏ qua, và giữ
     * nguyên giá trị cũ chứ không hạ xuống.
     */
    ...(laQuanTri ? { noiBat: form.get('noiBat') === 'on' } : {}),
  };

  /*
   * Đổi biểu tượng thì gỡ tấm cũ khỏi kho ảnh.
   *
   * Đọc tấm cũ TRƯỚC khi ghi đè, vì sau đó không còn chỗ nào biết nó nữa. Và
   * chỉ gỡ khi thật sự khác: lưu lại game mà không đụng tới ảnh là chuyện xảy
   * ra suốt, mà gỡ nhầm thì trang thủng lỗ ngay.
   */
  const iconCu = id
    ? (await db.game.findUnique({ where: { id }, select: { icon: true } }))?.icon ?? null
    : null;

  /*
   * SỬA bằng `updateMany` chứ không `update`, để điều kiện "game của tôi" nằm
   * TRONG `where`. `update` nhận `where` kiểu duy nhất nên không nhét thêm
   * `tacGiaId` vào được, và mọi cách còn lại đều là "đọc lên rồi so" — tức là
   * có khe hở, và quên mất câu so là mở toang.
   */
  let gameId: string;
  if (id) {
    const { count } = await db.game.updateMany({
      where: laQuanTri ? { id } : { id, tacGiaId: nguoi.id },
      data: duLieu,
    });
    if (count === 0) return { loi: LOI_KHONG_QUYEN };
    gameId = id;
  } else {
    const moi = await db.game.create({
      // Tác giả tạo game thì game ấy thuộc về họ ngay. Quản trị tạo thì để
      // trống — đó là game của chính cửa hàng.
      data: { ...duLieu, ...(laQuanTri ? {} : { tacGiaId: nguoi.id }) },
      select: { id: true },
    });
    gameId = moi.id;
  }
  const game = { id: gameId };

  if (iconCu && iconCu !== duLieu.icon) await xoaAnh(iconCu);

  // Thể loại: xoá hết rồi gắn lại. Danh sách chỉ vài mục nên rẻ, mà so từng
  // cái để thêm/bớt thì dài gấp ba lần và dễ sót đúng cái vừa bỏ chọn.
  const theLoaiId = form.getAll('theLoai').map(String).filter(Boolean);
  await db.theLoaiTrenGame.deleteMany({ where: { gameId: game.id } });
  if (theLoaiId.length > 0) {
    await db.theLoaiTrenGame.createMany({
      data: theLoaiId.map((t) => ({ gameId: game.id, theLoaiId: t })),
      skipDuplicates: true,
    });
  }

  // Dựng lại chuỗi tìm SAU khi gắn xong thể loại — nó gộp cả tên thể loại vào,
  // nên dựng trước thì chuỗi thiếu đúng phần vừa đổi.
  await lamMoiChuoiTim(game.id);

  revalidatePath('/quan-tri/game');
  revalidatePath('/quan-ly/game');
  revalidatePath(`/game/${duongDan}`);

  /*
   * Về đúng khu người ta đang đứng.
   *
   * Cùng một biểu mẫu phục vụ hai bảng điều khiển, nên nơi gọi nói rõ mình ở
   * đâu. Không có thì đoán theo vai trò — mà một người vừa là tác giả vừa là
   * quản trị thì đoán kiểu gì cũng sai một nửa số lần.
   */
  const veSau = chu(form, 'veSau');
  redirect(veSau === 'tac-gia' ? `/quan-ly/game/${game.id}` : `/quan-tri/game/${game.id}`);
}

/** Bày game ra cửa hàng, hoặc rút về nháp. */
export async function doiTrangThai(gameId: string, trangThai: 'NHAP' | 'DANG_HIEN' | 'DA_GO'): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  /*
   * CHỈ ghi `trangThai` ở lượt này, KHÔNG đụng tới `dangLuc`.
   *
   * Bản trước viết `dangLuc: { set: undefined }` với ý "để nguyên cột ấy".
   * Prisma không hiểu thế: nó đòi một DateTime hoặc null, gặp object là ném
   * lỗi — nên mọi lần bấm Đăng từ khu quản trị đều hỏng, im lặng, suốt từ đầu.
   * Kho vẫn chạy vì kịch bản gieo dữ liệu tự đặt `dangLuc` lấy, nên không ai
   * gặp. Muốn để nguyên một cột thì đơn giản là ĐỪNG nhắc tới nó.
   *
   * Ngày đăng đặt ở lượt thứ hai bên dưới, và chỉ đặt LẦN ĐẦU: rút về nháp rồi
   * đăng lại mà đặt lại ngày thì game cũ nhảy lên đầu kệ "Mới ra mắt", đẩy
   * game mới thật xuống dưới.
   */
  const game = await db.game.update({
    where: { id: gameId },
    data: { trangThai },
    select: { id: true, duongDan: true, dangLuc: true },
  });

  if (trangThai === 'DANG_HIEN' && !game.dangLuc) {
    await db.game.update({ where: { id: gameId }, data: { dangLuc: new Date() }, select: { id: true } });
  }

  revalidatePath('/quan-tri/game');
  revalidatePath(`/game/${game.duongDan}`);
  revalidatePath('/');
  return {};
}

/** Thêm một bản tải kèm một tệp. Gộp làm một vì bản không tệp thì tải bằng gì. */
export async function themBanTai(_truoc: KetQua, form: FormData): Promise<KetQua> {
  const gameId = chu(form, 'gameId');
  let quyen;
  try { quyen = await quyenTrenGame(gameId); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const heMay = chu(form, 'heMay') as MaHeMay;
  const soHieu = chu(form, 'soHieu');
  const duongDanTep = chu(form, 'duongDanTep');
  const loaiTep = chu(form, 'loaiTep') as MaLoaiTep;
  const cuaHang = chu(form, 'duongDanCuaHang');

  if (!(HE_MAY as readonly string[]).includes(heMay)) return { loi: 'Hệ máy không hợp lệ.' };
  if (!soHieu) return { loi: 'Hãy nhập số hiệu bản, ví dụ 1.0.' };
  // Tệp gắn ngay lúc tạo bản trước đây KHÔNG kiểm gì cả — lối vào này bị bỏ
  // sót trong khi lối "gắn thêm tệp" thì có kiểm.
  if (duongDanTep && !laDiaChiHopLe(duongDanTep)) return { loi: LOI_DIA_CHI };
  if (cuaHang && !laHttpsHopLe(cuaHang)) {
    return { loi: 'Đường dẫn cửa hàng phải là một địa chỉ https đầy đủ.' };
  }

  // Điều kiện "game này của tôi" nằm TRONG `where` — xem `quyen-game.ts`.
  const game = await db.game.findFirst({ where: quyen.loc, select: { duongDan: true } });
  if (!game) return { loi: LOI_KHONG_QUYEN };

  const daCo = await db.banTai.findFirst({
    where: { gameId, heMay, soHieu }, select: { id: true },
  });
  if (daCo) return { loi: `Bản ${soHieu} của ${heMay} đã có rồi.` };

  await db.$transaction(async (tx) => {
    // Bản mới thành bản mới nhất CỦA HỆ ẤY, và hạ cờ của bản cũ cùng hệ —
    // mỗi hệ chỉ được đúng một bản mang cờ, không thì trang game không biết
    // bày bản nào ra trước.
    await tx.banTai.updateMany({ where: { gameId, heMay }, data: { moiNhat: false } });

    const ban = await tx.banTai.create({
      data: {
        gameId, heMay, soHieu, moiNhat: true,
        ghiChu: chu(form, 'ghiChu') || null,
        doiMoi: chu(form, 'doiMoi') || null,
        duongDanCuaHang: cuaHang || null,
        ngayRa: new Date(),
      },
      select: { id: true },
    });

    if (duongDanTep && laLoaiTep(loaiTep)) {
      // Dung lượng đo thẳng từ tệp thật — xem `doDungLuongTep` để biết vì sao
      // không bắt người nhập gõ tay con số ấy.
      await tx.tepTai.create({
        data: { banId: ban.id, loai: loaiTep, duongDan: duongDanTep, dungLuong: await doDungLuongTep(duongDanTep) },
        select: { id: true },
      });
      await tinhLaiDungLuongBan(tx as typeof db, ban.id);
    }
  });

  // Ngoài giao dịch: bản đã ra rồi, thông báo hỏng thì không được kéo nó đổ theo.
  await baoBanMoi(gameId, heMay, soHieu);

  revalidatePath(`/quan-tri/game/${gameId}`);
  revalidatePath(`/game/${game.duongDan}`);
  return {};
}

export async function xoaBanTai(banId: string): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  // Lọc qua QUAN HỆ: một bản tải không mang chủ sở hữu, nhưng game của nó thì
  // có. Hỏi luôn trong một câu thay vì đọc game lên rồi so.
  const ban = await db.banTai.findFirst({
    where: { id: banId, game: locGameCuaToi(nguoi) },
    select: { gameId: true },
  });
  if (!ban) return { loi: LOI_KHONG_QUYEN };
  await db.banTai.delete({ where: { id: banId } });
  revalidatePath(`/quan-tri/game/${ban.gameId}`);
  return {};
}

/** Trả lời một yêu cầu game. */
export async function traLoiYeuCau(id: string, trangThai: string, loiNhan: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const hopLe = ['CHO_XEM', 'DANG_TIM', 'DA_THEM', 'TU_CHOI'];
  if (!hopLe.includes(trangThai)) return { loi: 'Trạng thái không hợp lệ.' };

  const yc = await db.yeuCau.update({
    where: { id },
    data: { trangThai: trangThai as 'CHO_XEM', loiNhan: loiNhan.trim().slice(0, 500) || null },
    select: { nguoiId: true, ten: true },
  });

  // Người gửi yêu cầu không có lý do gì để quay lại trang ấy xem đã có trả lời
  // chưa — nên phải chủ động báo, bằng không lời trả lời nằm đó không ai đọc.
  const noi = { CHO_XEM: 'đang chờ xem', DANG_TIM: 'đang được tìm', DA_THEM: 'đã lên kệ', TU_CHOI: 'bị từ chối' };
  await guiThongBao({
    nguoiNhanId: yc.nguoiId,
    loai: 'TRA_LOI_YEU_CAU',
    tieuDe: `Yêu cầu “${yc.ten}” ${noi[trangThai as keyof typeof noi] ?? 'đã được xem'}`,
    chiTiet: loiNhan.trim() || null,
    duongDan: '/yeu-cau',
  });

  revalidatePath('/quan-tri/yeu-cau');
  revalidatePath('/yeu-cau');
  return {};
}

/**
 * Gắn một ảnh chụp cho game.
 *
 * `thuTu` tính bằng "ảnh cuối cùng + 10" chứ không phải "số ảnh đang có": chừa
 * khoảng trống giữa hai ảnh để sau này đổi chỗ chỉ cần ghi lại một con số,
 * không phải đánh số lại cả dãy.
 */
export async function themAnhChup(_truoc: KetQua, form: FormData): Promise<KetQua> {
  const gameId = chu(form, 'gameId');
  let quyen;
  try { quyen = await quyenTrenGame(gameId); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const duongDanAnh = chu(form, 'duongDanAnh');
  if (!duongDanAnh) return { loi: 'Hãy chọn một ảnh.' };

  // Chỉ nhận ảnh trong nhà hoặc qua https — và kiểm bằng cách PHÂN TÍCH địa
  // chỉ, không so đầu chuỗi; xem `dia-chi-an-toan.ts` để biết vì sao.
  if (!laDiaChiHopLe(duongDanAnh)) return { loi: LOI_DIA_CHI };

  const game = await db.game.findFirst({ where: quyen.loc, select: { duongDan: true } });
  if (!game) return { loi: 'Không tìm thấy game.' };

  const cuoi = await db.anhChup.findFirst({
    where: { gameId }, orderBy: { thuTu: 'desc' }, select: { thuTu: true },
  });

  await db.anhChup.create({
    data: {
      gameId,
      duongDan: duongDanAnh,
      chuThich: chu(form, 'chuThich') || null,
      thuTu: (cuoi?.thuTu ?? 0) + 10,
    },
    select: { id: true },
  });

  revalidatePath(`/quan-tri/game/${gameId}`);
  revalidatePath(`/game/${game.duongDan}`);
  return {};
}

export async function xoaAnhChup(anhId: string): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const anh = await db.anhChup.findFirst({
    where: { id: anhId, game: locGameCuaToi(nguoi) },
    select: { duongDan: true, game: { select: { id: true, duongDan: true } } },
  });
  if (!anh) return { loi: LOI_KHONG_QUYEN };

  await db.anhChup.delete({ where: { id: anhId } });
  /*
   * Gỡ luôn tệp khỏi kho ảnh, SAU khi hàng trong CSDL đã mất.
   *
   * Thứ tự ấy quan trọng: xoá tệp trước mà lượt xoá hàng hỏng thì trang còn
   * trỏ vào một tấm ảnh không còn nữa — thủng lỗ ngay trên mặt tiền. Ngược
   * lại, tệp mồ côi nằm trong kho thì chẳng ai thấy.
   */
  await xoaAnh(anh.duongDan);
  revalidatePath(`/quan-tri/game/${anh.game.id}`);
  revalidatePath(`/game/${anh.game.duongDan}`);
  return {};
}

/**
 * Đổi chỗ một ảnh với ảnh liền kề.
 *
 * Hai người quản trị bấm cùng lúc thì `thuTu` có thể trùng nhau; không sao, vì
 * `orderBy` đã có khoá phụ, và lần bấm sau vẫn đổi được chỗ. Khoá hàng lại chỉ
 * để xếp thứ tự ảnh là cái giá quá đắt cho thứ chẳng ai thiệt hại.
 */
export async function doiChoAnhChup(anhId: string, len: boolean): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const anh = await db.anhChup.findFirst({
    where: { id: anhId, game: locGameCuaToi(nguoi) },
    select: { id: true, thuTu: true, gameId: true, game: { select: { duongDan: true } } },
  });
  if (!anh) return { loi: LOI_KHONG_QUYEN };

  const canh = await db.anhChup.findFirst({
    where: {
      gameId: anh.gameId,
      id: { not: anh.id },
      thuTu: len ? { lte: anh.thuTu } : { gte: anh.thuTu },
    },
    orderBy: len ? [{ thuTu: 'desc' }, { id: 'desc' }] : [{ thuTu: 'asc' }, { id: 'asc' }],
    select: { id: true, thuTu: true },
  });
  if (!canh) return {};

  await db.$transaction([
    db.anhChup.update({ where: { id: anh.id }, data: { thuTu: canh.thuTu }, select: { id: true } }),
    db.anhChup.update({ where: { id: canh.id }, data: { thuTu: anh.thuTu }, select: { id: true } }),
  ]);

  revalidatePath(`/quan-tri/game/${anh.gameId}`);
  revalidatePath(`/game/${anh.game.duongDan}`);
  return {};
}

/**
 * Cửa hàng đáp lại một bài đánh giá.
 *
 * Gửi chuỗi rỗng là XOÁ lời đáp — quản trị viết hớ một câu thì phải rút được
 * về, mà thêm hẳn một endpoint xoá riêng chỉ để làm việc ấy thì là hai chỗ
 * cùng kiểm quyền cho một việc.
 */
export async function traLoiDanhGia(danhGiaId: string, loi: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const chuLoi = loi.trim().slice(0, 1000);

  const bai = await db.danhGia.findUnique({
    where: { id: danhGiaId },
    select: { nguoiId: true, game: { select: { ten: true, duongDan: true } } },
  });
  if (!bai) return { loi: 'Không tìm thấy bài đánh giá.' };

  await db.danhGia.update({
    where: { id: danhGiaId },
    data: chuLoi ? { traLoi: chuLoi, traLoiLuc: new Date() } : { traLoi: null, traLoiLuc: null },
    select: { id: true },
  });

  // Làm mới cả trang game công khai LẪN hai chỗ trong khu quản trị: huy hiệu
  // "chưa đáp" trên thanh bên và danh sách lọc mặc định đều đọc từ con số này,
  // nên quên một chỗ là vừa trả lời xong mà huy hiệu vẫn nguyên số cũ.
  // Chỉ báo khi THÊM lời đáp, không báo lúc xoá: "cửa hàng đã rút lại lời đáp"
  // là một tin chẳng ai cần biết.
  if (chuLoi) {
    await guiThongBao({
      nguoiNhanId: bai.nguoiId,
      loai: 'DAP_DANH_GIA',
      tieuDe: `SunnyStore đã trả lời đánh giá của bạn`,
      chiTiet: `${bai.game.ten} · ${chuLoi}`,
      duongDan: `/game/${bai.game.duongDan}`,
    });
  }

  revalidatePath(`/game/${bai.game.duongDan}`);
  revalidatePath('/quan-tri/danh-gia');
  revalidatePath('/quan-tri');
  return {};
}

/* ──────────────────────────────────────────────────────────────────────────
 * KIỂM DUYỆT DIỄN ĐÀN
 *
 * `ChuDe.ghim` và `ChuDe.khoa` đã được trang diễn đàn ĐỌC từ đầu — có biểu
 * tượng ghim, có câu "đã khoá", có cả việc giấu ô trả lời đi. Nhưng không nơi
 * nào ĐẶT được hai cột ấy, nên chúng vĩnh viễn bằng `false`. Nghĩa là mã hiển
 * thị đúng, chỉ thiếu đúng cái công tắc. Đây là công tắc ấy.
 * ────────────────────────────────────────────────────────────────────────── */

/** Ghim hoặc bỏ ghim một chủ đề. */
export async function ghimChuDe(chuDeId: string, ghim: boolean): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const c = await db.chuDe.update({
    where: { id: chuDeId },
    data: { ghim },
    select: { gameId: true, game: { select: { duongDan: true } } },
  });

  revalidatePath(`/game/${c.game.duongDan}/dien-dan`);
  revalidatePath('/quan-tri/dien-dan');
  return {};
}

/** Khoá hoặc mở một chủ đề. Khoá rồi thì không ai trả lời thêm được nữa. */
export async function khoaChuDe(chuDeId: string, khoa: boolean): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const c = await db.chuDe.update({
    where: { id: chuDeId },
    data: { khoa },
    select: { id: true, game: { select: { duongDan: true } } },
  });

  revalidatePath(`/game/${c.game.duongDan}/dien-dan`);
  revalidatePath(`/game/${c.game.duongDan}/dien-dan/${chuDeId}`);
  revalidatePath('/quan-tri/dien-dan');
  return {};
}

/**
 * Xoá hẳn một chủ đề, kéo theo mọi lời đáp trong đó.
 *
 * Lời đáp đi theo nhờ `onDelete: Cascade` ở lược đồ, không phải nhờ đoạn mã
 * nào ở đây — nên thêm một bảng mới treo vào chủ đề thì nhớ khai báo cho đúng,
 * bằng không nó ở lại thành rác không ai trỏ tới.
 */
export async function xoaChuDe(chuDeId: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const c = await db.chuDe.findUnique({
    where: { id: chuDeId },
    select: { tieuDe: true, nguoiId: true, game: { select: { duongDan: true } } },
  });
  if (!c) return {};

  await db.chuDe.delete({ where: { id: chuDeId } });

  /*
   * Báo cho người viết biết bài của họ đã bị gỡ.
   *
   * Gỡ im lặng thì người ấy đi tìm bài mình, không thấy, và kết luận trang bị
   * lỗi — rồi đăng lại đúng bài ấy. Nói ra thì họ biết vì sao và thôi.
   *
   * `duongDan` để RỖNG: bài không còn, dẫn tới một trang 404 còn tệ hơn không
   * dẫn đi đâu.
   */
  await guiThongBao({
    nguoiNhanId: c.nguoiId,
    loai: 'GO_NOI_DUNG',
    tieuDe: 'Một chủ đề của bạn đã bị gỡ',
    chiTiet: c.tieuDe,
  });

  revalidatePath(`/game/${c.game.duongDan}/dien-dan`);
  revalidatePath('/quan-tri/dien-dan');
  revalidatePath('/quan-tri');
  return {};
}

/**
 * Xoá một lời đáp.
 *
 * `ChuDe.soTraLoi` là bản đếm sẵn nên phải trừ lại TRONG CÙNG giao dịch với
 * lần xoá. Đếm lại từ bảng thay vì trừ đi một: trừ tay thì mỗi lần lệch là
 * lệch vĩnh viễn, mà không có chỗ nào phát hiện ra.
 */
export async function xoaTraLoi(traLoiId: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const t = await db.traLoi.findUnique({
    where: { id: traLoiId },
    select: {
      chuDeId: true, nguoiId: true, noiDung: true,
      chuDe: { select: { tieuDe: true, game: { select: { duongDan: true } } } },
    },
  });
  if (!t) return {};

  await db.$transaction(async (tx) => {
    await tx.traLoi.delete({ where: { id: traLoiId } });
    const con = await tx.traLoi.count({ where: { chuDeId: t.chuDeId } });
    await tx.chuDe.update({
      where: { id: t.chuDeId }, data: { soTraLoi: con }, select: { id: true },
    });
  });

  await guiThongBao({
    nguoiNhanId: t.nguoiId,
    loai: 'GO_NOI_DUNG',
    tieuDe: 'Một lời đáp của bạn đã bị gỡ',
    chiTiet: `Trong chủ đề “${t.chuDe.tieuDe}”`,
  });

  revalidatePath(`/game/${t.chuDe.game.duongDan}/dien-dan/${t.chuDeId}`);
  revalidatePath('/quan-tri/dien-dan');
  return {};
}

/**
 * Xoá một bài đánh giá.
 *
 * Hai cột đếm sẵn ở bảng Game phải khớp lại sau đó, và tính lại từ chính bảng
 * đánh giá chứ không trừ dần — đó là thứ luôn đúng, kể cả khi có ai đó đã ghi
 * thẳng vào CSDL trước đấy.
 */
export async function xoaDanhGia(danhGiaId: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const d = await db.danhGia.findUnique({
    where: { id: danhGiaId },
    select: { gameId: true, nguoiId: true, game: { select: { ten: true, duongDan: true } } },
  });
  if (!d) return {};

  await db.$transaction(async (tx) => {
    await tx.danhGia.delete({ where: { id: danhGiaId } });
    const gom = await tx.danhGia.aggregate({
      where: { gameId: d.gameId }, _sum: { sao: true }, _count: { _all: true },
    });
    await tx.game.update({
      where: { id: d.gameId },
      data: { tongSao: gom._sum.sao ?? 0, soLuotDanhGia: gom._count._all },
      select: { id: true },
    });
  });

  await guiThongBao({
    nguoiNhanId: d.nguoiId,
    loai: 'GO_NOI_DUNG',
    tieuDe: 'Đánh giá của bạn đã bị gỡ',
    chiTiet: d.game.ten,
  });

  revalidatePath(`/game/${d.game.duongDan}`);
  revalidatePath('/quan-tri/danh-gia');
  revalidatePath('/quan-tri');
  return {};
}

/**
 * XOÁ HẲN một game.
 *
 * Bắt gõ lại đúng tên game để xác nhận. Một hộp thoại "bạn có chắc không?" thì
 * ai cũng bấm Đồng ý theo phản xạ, còn gõ lại cái tên thì buộc phải đọc xem
 * mình đang đứng ở game nào — đúng cái nhịp dừng mà thao tác không lùi lại
 * được này cần.
 *
 * Kéo theo bản tải, tệp, ảnh chụp, đánh giá, chủ đề, lượt tải — tất cả nhờ
 * `onDelete: Cascade` ở lược đồ. Lượt tải đi theo nghĩa là con số "tổng lượt
 * tải" ở trang tổng quan tụt xuống; đó là đúng, vì game ấy không còn nữa.
 */
export async function xoaGame(gameId: string, tenGoLai: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const game = await db.game.findUnique({
    where: { id: gameId },
    select: {
      ten: true, duongDan: true, icon: true,
      anhChup: { select: { duongDan: true } },
    },
  });
  if (!game) return { loi: 'Không tìm thấy game.' };

  if (tenGoLai.trim() !== game.ten) {
    return { loi: `Tên gõ vào không khớp. Hãy gõ đúng “${game.ten}”.` };
  }

  await db.game.delete({ where: { id: gameId } });

  /*
   * Ảnh chụp đi theo game nhờ `onDelete: Cascade`, nhưng TỆP trong kho ảnh thì
   * không: cascade chỉ biết tới hàng trong CSDL. Không gỡ ở đây thì mỗi game
   * bị xoá để lại một nắm tệp không ai trỏ tới, và hoá đơn kho cứ dày lên.
   *
   * Gỡ SAU khi xoá xong, và `xoaAnh` tự nuốt lỗi: game đã mất rồi thì một tệp
   * mồ côi không đáng để làm hỏng cả lượt xoá.
   */
  await Promise.all([game.icon, ...game.anhChup.map((a) => a.duongDan)].map(xoaAnh));

  revalidatePath('/quan-tri/game');
  revalidatePath('/quan-tri');
  revalidatePath(`/game/${game.duongDan}`);
  revalidatePath('/');
  redirect('/quan-tri/game');
}

/* ──────────────────────────────────────────────────────────────────────────
 * THỂ LOẠI
 *
 * Trước đây thể loại chỉ ra đời được bằng kịch bản gieo dữ liệu. Thêm một thể
 * loại mới nghĩa là phải sửa mã nguồn rồi chạy lại lệnh gieo — trên máy thật
 * thì đó là việc không ai làm, nên danh sách thể loại đóng băng vĩnh viễn.
 * ────────────────────────────────────────────────────────────────────────── */

/** Thêm mới hoặc đổi tên một thể loại. */
export async function luuTheLoai(_truoc: KetQua, form: FormData): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const id = chu(form, 'id') || null;
  const ten = chu(form, 'ten');
  if (ten.length < 2) return { loi: 'Hãy nhập tên thể loại.' };

  const duongDan = thanhDuongDan(chu(form, 'duongDan') || ten);
  if (!duongDan) return { loi: 'Tên này không tạo được đường dẫn hợp lệ.' };

  const trung = await db.theLoai.findFirst({
    where: { duongDan, ...(id ? { NOT: { id } } : {}) }, select: { id: true },
  });
  if (trung) return { loi: `Đường dẫn “${duongDan}” đã có thể loại khác dùng.` };

  if (id) {
    await db.theLoai.update({ where: { id }, data: { ten, duongDan }, select: { id: true } });
  } else {
    // Xếp cuối danh sách, cách mục cuối 10 nấc — chừa chỗ để sau này đổi chỗ
    // chỉ phải ghi lại một con số thay vì đánh số lại cả dãy.
    const cuoi = await db.theLoai.findFirst({ orderBy: { thuTu: 'desc' }, select: { thuTu: true } });
    await db.theLoai.create({
      data: { ten, duongDan, thuTu: (cuoi?.thuTu ?? 0) + 10 }, select: { id: true },
    });
  }

  // Đổi tên thể loại thì chuỗi tìm của mọi game mang nhãn ấy đã cũ — gõ tên
  // mới sẽ không ra game nào. Dựng lại từng cái; danh sách này luôn nhỏ.
  if (id) {
    const gan = await db.theLoaiTrenGame.findMany({
      where: { theLoaiId: id }, select: { gameId: true },
    });
    for (const x of gan) await lamMoiChuoiTim(x.gameId);
  }

  revalidatePath('/quan-tri/the-loai');
  revalidatePath('/duyet');
  revalidatePath('/game');
  return {};
}

/**
 * Xoá một thể loại.
 *
 * CHẶN nếu còn game nào đang gắn nó. Lược đồ để `TheLoaiTrenGame` cascade nên
 * xoá vẫn trôi, nhưng trôi im lặng: mười hai game bỗng mất một nhãn phân loại
 * mà không ai biết, và không có đường lùi. Thà báo ra rồi bắt gỡ nhãn trước.
 */
export async function xoaTheLoai(theLoaiId: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const dangDung = await db.theLoaiTrenGame.count({ where: { theLoaiId } });
  if (dangDung > 0) {
    return { loi: `Còn ${dangDung} game đang thuộc thể loại này. Gỡ nhãn ở từng game trước đã.` };
  }

  await db.theLoai.delete({ where: { id: theLoaiId } });

  revalidatePath('/quan-tri/the-loai');
  revalidatePath('/duyet');
  revalidatePath('/game');
  return {};
}

/** Đổi chỗ một thể loại với thể loại liền kề. Cùng lối với ảnh chụp. */
export async function doiChoTheLoai(theLoaiId: string, len: boolean): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const t = await db.theLoai.findUnique({
    where: { id: theLoaiId }, select: { id: true, thuTu: true },
  });
  if (!t) return { loi: 'Không tìm thấy thể loại.' };

  const canh = await db.theLoai.findFirst({
    where: { id: { not: t.id }, thuTu: len ? { lte: t.thuTu } : { gte: t.thuTu } },
    orderBy: len ? [{ thuTu: 'desc' }, { id: 'desc' }] : [{ thuTu: 'asc' }, { id: 'asc' }],
    select: { id: true, thuTu: true },
  });
  if (!canh) return {};

  await db.$transaction([
    db.theLoai.update({ where: { id: t.id }, data: { thuTu: canh.thuTu }, select: { id: true } }),
    db.theLoai.update({ where: { id: canh.id }, data: { thuTu: t.thuTu }, select: { id: true } }),
  ]);

  revalidatePath('/quan-tri/the-loai');
  revalidatePath('/duyet');
  revalidatePath('/game');
  return {};
}

/* ──────────────────────────────────────────────────────────────────────────
 * BẢN TẢI VÀ TỆP
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Đo dung lượng THẬT của một tệp nằm trong thư mục `public`.
 *
 * Bắt người nhập gõ tay con số byte là cách chắc chắn có ngày lệch: gõ nhầm
 * một chữ số thì trang game ghi "1,1 MB" trong khi tệp tải về nặng 11 MB, mà
 * chẳng có gì đối chiếu để phát hiện. Đo thẳng tệp thì con số luôn đúng, và
 * đúng mãi kể cả khi ai đó thay tệp khác vào cùng đường dẫn rồi bấm lưu lại.
 *
 * Địa chỉ ngoài (`https://…`) thì chịu — không tải cả tệp về chỉ để cân nó.
 * Trả `null`, và trang game tự biết giấu phần dung lượng đi.
 */
async function doDungLuongTep(duongDan: string): Promise<bigint | null> {
  if (xemDiaChi(duongDan) !== 'trong-nha') return null;
  try {
    const { stat } = await import('node:fs/promises');
    const path = await import('node:path');
    // `path.join` tự gạt bỏ `..` — không thì một đường dẫn khéo léo đọc được
    // kích thước tệp bất kỳ ngoài thư mục `public`.
    const that = path.join(process.cwd(), 'public', path.normalize(duongDan));
    if (!that.startsWith(path.join(process.cwd(), 'public'))) return null;
    return BigInt((await stat(that)).size);
  } catch {
    return null; // chưa có tệp ở đó — người nhập có thể tải lên sau
  }
}

/**
 * Cộng lại dung lượng của một bản từ chính các tệp của nó.
 *
 * Bản nhiều tệp (JAR kèm JAD) thì con số người tải cần biết là TỔNG, vì họ sẽ
 * lấy hết. Cộng lại từ bảng chứ không cộng dồn tay: cộng dồn thì mỗi lần xoá
 * một tệp mà quên trừ là lệch vĩnh viễn.
 */
async function tinhLaiDungLuongBan(tx: typeof db, banId: string) {
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

/** Sửa thông tin một bản tải đã có. */
export async function suaBanTai(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const banId = chu(form, 'banId');
  const soHieu = chu(form, 'soHieu');
  if (!soHieu) return { loi: 'Hãy nhập số hiệu bản.' };

  const ban = await db.banTai.findFirst({
    where: { id: banId, game: locGameCuaToi(nguoi) },
    select: { gameId: true, heMay: true, game: { select: { duongDan: true } } },
  });
  if (!ban) return { loi: LOI_KHONG_QUYEN };

  // `@@unique([gameId, heMay, soHieu])` sẽ chặn, nhưng chặn bằng một lỗi thô.
  // Kiểm trước để báo một câu người đọc hiểu được.
  const trung = await db.banTai.findFirst({
    where: { gameId: ban.gameId, heMay: ban.heMay, soHieu, NOT: { id: banId } },
    select: { id: true },
  });
  if (trung) return { loi: `Bản ${soHieu} của hệ này đã có rồi.` };

  const cuaHangMoi = chu(form, 'duongDanCuaHang');
  if (cuaHangMoi && !laHttpsHopLe(cuaHangMoi)) {
    return { loi: 'Đường dẫn cửa hàng phải là một địa chỉ https đầy đủ.' };
  }

  const ngay = chu(form, 'ngayRa');
  await db.banTai.update({
    where: { id: banId },
    data: {
      soHieu,
      ghiChu: chu(form, 'ghiChu') || null,
      doiMoi: chu(form, 'doiMoi') || null,
      duongDanCuaHang: cuaHangMoi || null,
      ngayRa: ngay ? new Date(ngay) : null,
    },
    select: { id: true },
  });

  revalidatePath(`/quan-tri/game/${ban.gameId}`);
  revalidatePath(`/game/${ban.game.duongDan}`);
  return {};
}

/**
 * Đặt một bản làm bản mới nhất của hệ máy ấy.
 *
 * Hạ cờ của mọi bản cùng hệ rồi mới dựng cờ cho bản này, trong CÙNG một giao
 * dịch: hai bản cùng mang cờ thì trang game không biết bày bản nào ra trước,
 * mà nó chọn bừa nên lỗi hiện ra lúc này lúc khác.
 */
export async function datBanMoiNhat(banId: string): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const ban = await db.banTai.findFirst({
    where: { id: banId, game: locGameCuaToi(nguoi) },
    select: { gameId: true, heMay: true, soHieu: true, game: { select: { duongDan: true } } },
  });
  if (!ban) return { loi: LOI_KHONG_QUYEN };

  await db.$transaction([
    db.banTai.updateMany({
      where: { gameId: ban.gameId, heMay: ban.heMay }, data: { moiNhat: false },
    }),
    db.banTai.update({ where: { id: banId }, data: { moiNhat: true }, select: { id: true } }),
  ]);

  await baoBanMoi(ban.gameId, ban.heMay as MaHeMay, ban.soHieu);

  revalidatePath(`/quan-tri/game/${ban.gameId}`);
  revalidatePath(`/game/${ban.game.duongDan}`);
  return {};
}

/** Gắn thêm một tệp vào bản đã có — ví dụ thêm JAD cho bản JAR. */
export async function themTep(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const banId = chu(form, 'banId');
  const duongDanTep = chu(form, 'duongDanTep');
  const loaiTep = chu(form, 'loaiTep') as MaLoaiTep;
  const tenTep = chu(form, 'tenTep').slice(0, 200);
  const maKiemTra = chu(form, 'maKiemTra').toLowerCase();

  if (!duongDanTep) return { loi: 'Hãy nhập địa chỉ tệp.' };
  if (!laLoaiTep(loaiTep)) return { loi: 'Loại tệp không hợp lệ.' };
  if (!laDiaChiHopLe(duongDanTep)) return { loi: LOI_DIA_CHI };
  /*
   * Mã kiểm tra phải ĐÚNG DẠNG sha256, không nhận chuỗi bất kỳ.
   *
   * Một mã gõ thiếu mấy ký tự trông vẫn như mã thật, mà người đối chiếu sẽ
   * thấy "không khớp" rồi kết luận tệp bị sửa đổi — tức là ta tự vu cho mình.
   * Thà từ chối ngay lúc nhập còn hơn.
   */
  if (maKiemTra && !/^[0-9a-f]{64}$/.test(maKiemTra)) {
    return { loi: 'Mã kiểm tra phải là 64 ký tự sha256 (0-9, a-f).' };
  }

  const ban = await db.banTai.findFirst({
    where: { id: banId, game: locGameCuaToi(nguoi) },
    select: { gameId: true, game: { select: { duongDan: true } } },
  });
  if (!ban) return { loi: LOI_KHONG_QUYEN };

  const dungLuong = await doDungLuongTep(duongDanTep);

  await db.$transaction(async (tx) => {
    await tx.tepTai.create({
      data: {
        banId, loai: loaiTep, duongDan: duongDanTep, dungLuong,
        tenTep: tenTep || null, maKiemTra: maKiemTra || null,
      },
      select: { id: true },
    });
    await tinhLaiDungLuongBan(tx as typeof db, banId);
  });

  revalidatePath(`/quan-tri/game/${ban.gameId}`);
  revalidatePath(`/game/${ban.game.duongDan}`);
  return {};
}

/** Gỡ một tệp khỏi bản. Dung lượng của bản cộng lại ngay trong cùng giao dịch. */
export async function xoaTep(tepId: string): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const tep = await db.tepTai.findFirst({
    where: { id: tepId, ban: { game: locGameCuaToi(nguoi) } },
    select: {
      banId: true,
      ban: { select: { gameId: true, game: { select: { duongDan: true } } } },
    },
  });
  if (!tep) return {};

  await db.$transaction(async (tx) => {
    await tx.tepTai.delete({ where: { id: tepId } });
    await tinhLaiDungLuongBan(tx as typeof db, tep.banId);
  });

  revalidatePath(`/quan-tri/game/${tep.ban.gameId}`);
  revalidatePath(`/game/${tep.ban.game.duongDan}`);
  return {};
}

/**
 * ĐỔI TRẠNG THÁI NHIỀU GAME CÙNG LÚC.
 *
 * Gọi lại `doiTrangThai` cho từng game chứ không viết một `updateMany`: luật
 * "ngày đăng chỉ đặt lần đầu" nằm trong hàm ấy, mà `updateMany` thì không chạy
 * qua nó được. Chép luật ra chỗ thứ hai là chuẩn bị sẵn cho ngày hai bản lệch
 * nhau — lúc ấy đăng một game và đăng mười game cho ra hai kết quả khác nhau.
 *
 * Chạy TUẦN TỰ, không `Promise.all`: mỗi lượt là một lượt ghi cộng một lượt
 * làm mới bộ đệm trang, và bắn ba chục lượt cùng lúc thì chỉ tổ tranh nhau
 * kết nối CSDL. Người bấm chọn ba chục game đã sẵn sàng chờ một nhịp rồi.
 */
export async function doiTrangThaiNhieu(
  gameId: string[],
  trangThai: 'NHAP' | 'DANG_HIEN' | 'DA_GO',
): Promise<KetQua & { so?: number }> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  // Chặn trần để một yêu cầu bịa ra không kéo cả cửa hàng vào một giao dịch.
  if (gameId.length === 0) return { so: 0 };
  if (gameId.length > 100) return { loi: 'Mỗi lượt tối đa 100 game.' };

  let so = 0;
  for (const id of gameId) {
    const kq = await doiTrangThai(id, trangThai);
    if (!kq.loi) so += 1;
  }

  revalidatePath('/quan-tri/game');
  revalidatePath('/quan-tri');
  return { so };
}

/* ──────────────────────────────────────────────────────────────────────────
 * BÁO XẤU
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Đóng một lượt báo mà KHÔNG xoá nội dung — "xem rồi, không có gì".
 *
 * Phải có lối này, bằng không hàng chờ chỉ vơi đi bằng cách xoá bài, và người
 * xử lý bị đẩy về phía xoá cả những bài chẳng sai gì.
 */
export async function boQuaBaoXau(baoXauId: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  await db.baoXau.update({
    where: { id: baoXauId }, data: { trangThai: 'BO_QUA' }, select: { id: true },
  });

  revalidatePath('/quan-tri/bao-xau');
  revalidatePath('/quan-tri');
  return {};
}

/**
 * Xoá nội dung bị báo, rồi đóng luôn MỌI lượt báo còn lại về chính nội dung ấy.
 *
 * Bản thân mấy hàng báo đi theo nhờ `onDelete: Cascade`, nên đoạn này không
 * phải dọn gì. Nhưng một nội dung có thể bị nhiều người báo, và khi ấy người
 * xử lý chỉ bấm một lần — mấy lượt kia biến mất cùng nội dung, đúng như mong
 * đợi. Chép lại điều đó ra đây vì nó KHÔNG nhìn thấy được trong mã: ai đọc
 * hàm này sẽ đi tìm đoạn dọn mà không có.
 */
export async function xoaNoiDungBiBao(
  loai: 'danhGia' | 'chuDe' | 'traLoi',
  mucId: string,
): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  // Dùng lại đúng ba hàm xoá đã có: chúng mang theo phần tính lại bộ đếm
  // (`Game.tongSao`, `ChuDe.soTraLoi`). Viết một lượt xoá riêng ở đây là chép
  // luật đếm ra chỗ thứ hai, rồi hai bản lệch nhau.
  const kq = loai === 'danhGia' ? await xoaDanhGia(mucId)
    : loai === 'chuDe' ? await xoaChuDe(mucId)
      : await xoaTraLoi(mucId);

  revalidatePath('/quan-tri/bao-xau');
  revalidatePath('/quan-tri');
  return kq;
}


/**
 * Dựng lại chuỗi tìm kiếm của một game.
 *
 * Đọc lại thể loại từ CSDL thay vì nhận từ nơi gọi: chỗ nào quên truyền là
 * chuỗi tìm mất phần thể loại, mà lỗi ấy chỉ lộ ra khi có người gõ đúng tên
 * thể loại rồi không thấy game — tức là không bao giờ lộ ra với người viết mã.
 */
async function lamMoiChuoiTim(gameId: string): Promise<void> {
  const g = await db.game.findUnique({
    where: { id: gameId },
    select: {
      ten: true, tenViet: true, nhaPhatTrien: true,
      theLoai: { select: { theLoai: { select: { ten: true } } } },
    },
  });
  if (!g) return;

  await db.game.update({
    where: { id: gameId },
    data: {
      timKiem: dungChuoiTim({
        ten: g.ten, tenViet: g.tenViet, nhaPhatTrien: g.nhaPhatTrien,
        theLoai: g.theLoai.map((t) => t.theLoai.ten),
      }),
    },
    select: { id: true },
  });
}


/* ──────────────────────────────────────────────────────────────────────────
 * KHOÁ TÀI KHOẢN VÀ ĐỔI VAI TRÒ
 *
 * Trang Thành viên trước đây CHỈ ĐỌC, cố ý: mỗi nút ở đây là một địa chỉ POST
 * công khai mới, mà lại là loại nguy hiểm nhất — tự phong quản trị, hoặc khoá
 * đúng người quản trị cuối cùng rồi không ai vào được nữa.
 *
 * Nay mở ra vì chuỗi kiểm duyệt đang cụt: báo xấu → gỡ bài → báo cho người
 * viết, rồi hết. Người rải bài quay lại rải tiếp, và người bán hàng chỉ còn
 * cách gỡ từng bài một, mãi. Cột `khoa` vốn đã được canh ở mọi lối vào
 * (`nguoiHienTai` lọc ngay trong `where`, `dangNhap` nói rõ lý do) — tức là
 * cả phần thi hành đã sẵn sàng từ lâu, chỉ thiếu đúng cái nút bật nó.
 *
 * Hai cái bẫy được chặn thẳng, xem chú thích từng hàm.
 * ────────────────────────────────────────────────────────────────────────── */

/** Khoá hoặc mở khoá một tài khoản. */
export async function khoaThanhVien(nguoiId: string, khoa: boolean): Promise<KetQua> {
  let toi;
  try { toi = await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  // Tự khoá mình là tự đá mình ra khỏi khu quản trị, và không có nút nào ở
  // giao diện để vào mở lại — chỉ còn cách sửa thẳng CSDL.
  if (nguoiId === toi.id) return { loi: 'Không tự khoá tài khoản của mình được.' };

  /*
   * Không khoá được một quản trị viên khác.
   *
   * Không phải vì tin nhau, mà vì luật này khiến mọi cuộc "khoá qua khoá lại"
   * thành không thể: muốn chặn một quản trị thì phải HẠ QUYỀN trước, và phép
   * hạ quyền đã có luật riêng canh số quản trị còn lại. Hai bước, mỗi bước một
   * luật rõ ràng, thay vì một nút làm được cả hai.
   */
  const { count } = await db.nguoiDung.updateMany({
    where: { id: nguoiId, vaiTro: 'THANH_VIEN' },
    data: { khoa },
  });
  if (count === 0) {
    return { loi: 'Không khoá được. Quản trị viên thì phải hạ quyền trước đã.' };
  }

  /*
   * Khoá xong thì xoá sạch phiên của người ấy.
   *
   * `nguoiHienTai` vốn đã lọc `khoa: false` ngay trong `where`, nên người bị
   * khoá mất quyền ngay lượt tải trang kế tiếp kể cả khi phiên còn sống. Xoá
   * thêm ở đây là để bảng `Phien` khỏi giữ lại một nắm hàng chết — và để câu
   * trả lời cho "khoá rồi thì phiên cũ còn dùng được không" là KHÔNG, ở cả
   * hai lớp, chứ không phải chỉ ở một lớp mà quên là hỏng.
   */
  if (khoa) {
    await db.phien.deleteMany({ where: { nguoiId } });
  }

  revalidatePath('/quan-tri/thanh-vien');
  return {};
}

/** Phong hoặc hạ quyền quản trị. */
export async function doiVaiTro(nguoiId: string, thanhQuanTri: boolean): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  if (thanhQuanTri) {
    // Phong quyền cho một tài khoản đang bị khoá là phong cho một người không
    // đăng nhập được — vô nghĩa, và che mất việc họ đang bị khoá.
    const { count } = await db.nguoiDung.updateMany({
      where: { id: nguoiId, khoa: false },
      data: { vaiTro: 'QUAN_TRI' },
    });
    if (count === 0) return { loi: 'Không phong được. Tài khoản này đang bị khoá.' };
    revalidatePath('/quan-tri/thanh-vien');
    return {};
  }

  /*
   * HẠ QUYỀN: KHO PHẢI CÒN ÍT NHẤT MỘT QUẢN TRỊ.
   *
   * Hạ nốt người cuối cùng là khoá cửa rồi ném chìa vào trong: không còn ai
   * vào được khu quản trị để phong lại cho ai cả, và lối duy nhất là sửa thẳng
   * CSDL. Đây đúng loại việc mà một lần bấm nhầm là hỏng vĩnh viễn.
   *
   * Luật này là một phép ĐẾM, nên nó đua được: hai quản trị cùng hạ quyền nhau
   * trong cùng một khoảnh khắc thì mỗi bên đều thấy "vẫn còn một người nữa" và
   * cả hai cùng xuống. Chạy ở mức cô lập `Serializable` để CSDL bắt đúng cú
   * ấy: một trong hai giao dịch bị dội ra, và ta trả lời như mọi lần từ chối.
   */
  try {
    await db.$transaction(async (tx) => {
      await tx.nguoiDung.update({
        where: { id: nguoiId },
        data: { vaiTro: 'THANH_VIEN' },
        select: { id: true },
      });
      const con = await tx.nguoiDung.count({ where: { vaiTro: 'QUAN_TRI' } });
      // Đếm SAU khi ghi, rồi huỷ cả giao dịch nếu hết người: hỏi trước rồi mới
      // ghi thì giữa hai bước ấy có một khe hở.
      if (con === 0) throw new Error('HET_QUAN_TRI');
    }, { isolationLevel: 'Serializable' });
  } catch (e) {
    if (e instanceof Error && e.message === 'HET_QUAN_TRI') {
      return { loi: 'Kho phải còn ít nhất một quản trị viên.' };
    }
    return { loi: 'Không đổi được vai trò lúc này. Thử lại giúp mình nhé.' };
  }

  revalidatePath('/quan-tri/thanh-vien');
  return {};
}

/**
 * Dựng thử Markdown thành HTML, cho ô xem trước ở trình soạn thảo.
 *
 * Chạy ở MÁY CHỦ và dùng đúng bộ dựng của trang game — xem trước mà dùng bộ
 * dựng khác thì nó là một lời hứa sai, và người soạn chỉ phát hiện ra sau khi
 * đã đăng.
 *
 * Không đụng CSDL, không nhận id nào, nên nó không cần quyền quản trị: thứ
 * duy nhất gửi vào là chữ của chính người gọi, và thứ trả về là chữ ấy dựng
 * lại. Vẫn chặn chuỗi quá dài để không ai lấy nó làm chỗ đốt CPU.
 */
export async function xemThuChuDam(chu: string): Promise<string> {
  return dungChuDam(String(chu ?? '').slice(0, 20_000));
}

/* ──────────────────────────────────────────────────────────────────────────
 * DUYỆT GAME
 *
 * Tác giả tự soạn game của mình, nhưng KHÔNG tự bày nó ra cửa hàng được. Ai
 * cũng đăng thẳng lên được thì cửa hàng thành bãi rác trong một tuần, và
 * người tải chẳng còn lý do gì để tin cái gì ở đây.
 *
 * Đường đi: NHAP → CHO_DUYET → DANG_HIEN, hoặc bị trả lại thành TU_CHOI rồi
 * sửa và gửi lại. Mỗi bước là một lượt ghi CÓ ĐIỀU KIỆN mang theo trạng thái
 * cũ, nên bấm hai lần hay hai người bấm cùng lúc cũng chỉ ăn một lần.
 * ────────────────────────────────────────────────────────────────────────── */

/** Tác giả gửi game đi duyệt. */
export async function guiDuyet(gameId: string): Promise<KetQua> {
  let quyen;
  try { quyen = await quyenTrenGame(gameId); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  /*
   * GAME PHẢI CÓ ĐỦ THỨ ĐỂ NGƯỜI TA TẢI ĐƯỢC, mới cho gửi.
   *
   * Chặn ở đây chứ không để ban quản trị phát hiện ra lúc duyệt: một vòng
   * gửi–từ chối–sửa–gửi lại tốn thời gian của cả hai bên, mà cái thiếu thì
   * máy tự nhìn ra được.
   */
  const game = await db.game.findFirst({
    where: quyen.loc,
    select: {
      ten: true, gioiThieu: true, trangThai: true,
      _count: { select: { banTai: true, theLoai: true } },
    },
  });
  if (!game) return { loi: LOI_KHONG_QUYEN };

  if (game.trangThai === 'DANG_HIEN') return { loi: 'Game này đang bày ngoài cửa hàng rồi.' };
  if (game.trangThai === 'CHO_DUYET') return { loi: 'Game này đang chờ duyệt.' };
  if (!game.gioiThieu?.trim()) return { loi: 'Hãy viết phần giới thiệu trước khi gửi duyệt.' };
  if (game._count.theLoai === 0) return { loi: 'Hãy chọn ít nhất một thể loại.' };
  if (game._count.banTai === 0) return { loi: 'Chưa có bản tải nào — không ai tải được gì.' };

  const { count } = await db.game.updateMany({
    // Trạng thái CŨ nằm trong `where`: bấm hai lần thì lần sau không khớp.
    where: { ...quyen.loc, trangThai: { in: ['NHAP', 'TU_CHOI', 'DA_GO'] } },
    data: { trangThai: 'CHO_DUYET', guiDuyetLuc: new Date(), lyDoTuChoi: null },
  });
  if (count === 0) return { loi: 'Không gửi được. Thử tải lại trang.' };

  revalidatePath('/quan-ly');
  revalidatePath(`/quan-ly/game/${gameId}`);
  revalidatePath('/quan-tri/duyet');
  return {};
}

/** Tác giả rút game về lại nháp khi đang chờ duyệt. */
export async function rutVeNhap(gameId: string): Promise<KetQua> {
  let quyen;
  try { quyen = await quyenTrenGame(gameId); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const { count } = await db.game.updateMany({
    where: { ...quyen.loc, trangThai: 'CHO_DUYET' },
    data: { trangThai: 'NHAP', guiDuyetLuc: null },
  });
  if (count === 0) return { loi: 'Game này không còn ở hàng chờ duyệt.' };

  revalidatePath('/quan-ly');
  revalidatePath('/quan-tri/duyet');
  return {};
}

/** Ban quản trị duyệt: game lên kệ. */
export async function duyetGame(gameId: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const game = await db.game.findUnique({
    where: { id: gameId },
    select: { ten: true, duongDan: true, tacGiaId: true, dangLuc: true },
  });
  if (!game) return { loi: 'Không tìm thấy game.' };

  const { count } = await db.game.updateMany({
    where: { id: gameId, trangThai: 'CHO_DUYET' },
    data: {
      trangThai: 'DANG_HIEN',
      lyDoTuChoi: null,
      // Giữ nguyên mốc đăng lần đầu: game gỡ xuống rồi bày lại không được
      // nhảy lên đầu kệ "Mới ra mắt" như hàng mới về.
      ...(game.dangLuc ? {} : { dangLuc: new Date() }),
    },
  });
  if (count === 0) return { loi: 'Game này không còn ở hàng chờ duyệt.' };

  if (game.tacGiaId) {
    await guiThongBao({
      nguoiNhanId: game.tacGiaId,
      loai: 'GAME_DA_DUYET',
      tieuDe: `${game.ten} đã được duyệt`,
      chiTiet: 'Game của bạn đang bày ngoài cửa hàng.',
      duongDan: `/game/${game.duongDan}`,
    });
  }

  revalidatePath('/quan-tri/duyet');
  revalidatePath('/quan-ly');
  revalidatePath(`/game/${game.duongDan}`);
  revalidatePath('/');
  return {};
}

/** Ban quản trị trả game về, kèm lý do. */
export async function tuChoiGame(gameId: string, lyDo: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  /*
   * BẮT BUỘC VIẾT LÝ DO.
   *
   * Trả về một cái game kèm hai chữ "không đạt" thì tác giả chỉ có nước đoán,
   * rồi gửi lại đúng thứ vừa bị trả — tốn thêm một vòng cho cả hai bên. Đây là
   * chỗ đáng bắt người duyệt gõ thêm vài dòng.
   */
  const chuLyDo = lyDo.trim().slice(0, 2000);
  if (chuLyDo.length < 10) {
    return { loi: 'Hãy viết rõ vì sao trả lại — ít nhất 10 ký tự.' };
  }

  const game = await db.game.findUnique({
    where: { id: gameId }, select: { ten: true, tacGiaId: true },
  });
  if (!game) return { loi: 'Không tìm thấy game.' };

  const { count } = await db.game.updateMany({
    where: { id: gameId, trangThai: 'CHO_DUYET' },
    data: { trangThai: 'TU_CHOI', lyDoTuChoi: chuLyDo, guiDuyetLuc: null },
  });
  if (count === 0) return { loi: 'Game này không còn ở hàng chờ duyệt.' };

  if (game.tacGiaId) {
    await guiThongBao({
      nguoiNhanId: game.tacGiaId,
      loai: 'GAME_BI_TU_CHOI',
      tieuDe: `${game.ten} chưa được duyệt`,
      chiTiet: chuLyDo,
      duongDan: `/quan-ly/game/${gameId}`,
    });
  }

  revalidatePath('/quan-tri/duyet');
  revalidatePath('/quan-ly');
  return {};
}

/** Tác giả tự sửa hồ sơ của mình. */
export async function luuHoSoTacGia(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }
  if (nguoi.vaiTro !== 'TAC_GIA' && nguoi.vaiTro !== 'QUAN_TRI') {
    return { loi: 'Bạn chưa phải tác giả.' };
  }

  const tenTacGia = chu(form, 'tenTacGia').slice(0, 60);
  const gioiThieu = chu(form, 'gioiThieuTacGia').slice(0, 4000);

  await db.nguoiDung.update({
    where: { id: nguoi.id },
    data: { tenTacGia: tenTacGia || null, gioiThieuTacGia: gioiThieu || null },
    select: { id: true },
  });

  revalidatePath('/quan-ly/ho-so');
  revalidatePath(`/tac-gia/${nguoi.tenDangNhap}`);
  return { ok: true };
}
