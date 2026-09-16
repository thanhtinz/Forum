import { headers } from 'next/headers';
import { db } from '@/lib/db';

/*
 * CHẶN DÒ MẬT KHẨU.
 *
 * Trước đợt này, phần xác thực chống được đo thời gian (vẫn chạy bcrypt kể cả
 * khi không có tài khoản) nhưng không có gì ngăn ai đó gõ thử mười nghìn lần.
 * Một mật khẩu 8 ký tự thường gặp thì dò xong trong một buổi tối.
 *
 * Đếm theo HAI khoá cùng lúc:
 *   • Định danh người ta gõ — chặn dò một tài khoản cụ thể.
 *   • Địa chỉ IP — chặn quét hàng loạt tài khoản từ một chỗ.
 *
 * ĐÁNH ĐỔI PHẢI NÓI RA: đếm theo định danh nghĩa là ai cũng có thể cố tình gõ
 * sai tám lần để khoá tạm một tài khoản họ biết tên. Đó là cái giá quen thuộc
 * của lối này, và chọn nó vì phía bên kia tệ hơn nhiều: không chặn gì cả thì
 * mật khẩu yếu nào cũng đổ. Giảm đau bằng cửa sổ NGẮN — 15 phút, không phải
 * khoá tới khi quản trị mở — và bằng việc đếm lại từ đầu ngay khi đăng nhập
 * đúng, nên người thật chỉ chờ một lần rồi thôi.
 */

const CUA_SO_MS = 15 * 60 * 1000;
const CAM_MS = 15 * 60 * 1000;

/*
 * HAI NGƯỠNG KHÁC NHAU, cố ý.
 *
 * Một định danh gõ sai 8 lần trong 15 phút thì gần như chắc chắn là dò mật
 * khẩu — người thật quên mật khẩu cũng hiếm khi thử tới lần thứ tám.
 *
 * Nhưng một ĐỊA CHỈ IP thì khác hẳn: quán net, ký túc xá, văn phòng — cả trăm
 * người ra ngoài Internet bằng đúng một địa chỉ. Đặt ngưỡng IP bằng ngưỡng
 * định danh là một người gõ sai làm cả phòng không đăng nhập được. Nới rộng ra
 * để nó vẫn chặn được kiểu quét hàng loạt tài khoản từ một chỗ, mà không cấm
 * oan một đám đông chỉ vì họ dùng chung đường ra.
 */
const TOI_DA_DINH_DANH = 8;
const TOI_DA_IP = 40;

/**
 * Bao nhiêu proxy của CHÍNH MÌNH đứng trước cửa hàng.
 *
 * Mặc định 1 — kiểu dựng thường gặp nhất: một nginx (hoặc một CDN) đứng trước,
 * nói thẳng với Next. Ai dựng hai tầng thì khai `SO_PROXY_TIN=2`.
 */
const SO_PROXY_TIN = Math.max(1, Number(process.env.SO_PROXY_TIN) || 1);

/**
 * Lấy IP người gọi. Không có thì trả rỗng — ở sau proxy lạ là chuyện có thật.
 *
 * KHÔNG LẤY MẨU ĐẦU CỦA `x-forwarded-for`. Proxy NỐI THÊM vào tiêu đề ấy chứ
 * không thay, nên mẩu đầu chính là chuỗi MÁY KHÁCH TỰ KHAI: gửi kèm
 * `X-Forwarded-For: 1.2.3.4` đổi mỗi lượt là mỗi lượt ra một khoá đếm mới, và
 * mọi cửa chặn theo IP trong tệp này hoá ra không chặn gì. Nặng nhất là cửa
 * chặn mở tài khoản hàng loạt — nó CHỈ đếm theo IP, mà mỗi tài khoản mới vẫn
 * ngốn một lượt bcrypt.
 *
 * Mẩu ĐÚNG là mẩu do proxy của chính mình nối vào, đếm ngược từ cuối dãy đúng
 * `SO_PROXY_TIN` bậc. Trước đó vẫn ưu tiên mấy tiêu đề do nhà cung cấp tự ký,
 * vì người ngoài không đặt đè được.
 */
async function layIp(): Promise<string> {
  const h = await headers();

  const kySan = h.get('cf-connecting-ip') ?? h.get('x-real-ip');
  if (kySan?.trim()) return kySan.trim();

  const xff = h.get('x-forwarded-for');
  if (xff) {
    const day = xff.split(',').map((x) => x.trim()).filter(Boolean);
    const o = day.length - SO_PROXY_TIN;
    return day[o >= 0 ? o : 0] ?? '';
  }
  return '';
}

interface Khoa { khoa: string; toiDa: number }

function khoaCua(dinhDanh: string, ip: string): Khoa[] {
  const k: Khoa[] = [
    { khoa: `dd:${dinhDanh.toLowerCase().slice(0, 100)}`, toiDa: TOI_DA_DINH_DANH },
  ];
  if (ip) k.push({ khoa: `ip:${ip.slice(0, 60)}`, toiDa: TOI_DA_IP });
  return k;
}

export interface KetQuaChan {
  chan: boolean;
  /** Số phút còn phải chờ. Chỉ có nghĩa khi `chan` là true. */
  conPhut: number;
}

/** Hỏi trước khi so mật khẩu: người này còn được thử không? */
export async function conDuocThu(dinhDanh: string): Promise<KetQuaChan> {
  const khoa = khoaCua(dinhDanh, await layIp()).map((k) => k.khoa);
  const bay = new Date();

  const hang = await db.lanHong.findMany({
    where: { khoa: { in: khoa }, camDen: { gt: bay } },
    select: { camDen: true },
  });
  if (hang.length === 0) return { chan: false, conPhut: 0 };

  const lauNhat = Math.max(...hang.map((h) => h.camDen!.getTime()));
  return { chan: true, conPhut: Math.max(1, Math.ceil((lauNhat - bay.getTime()) / 60_000)) };
}

/**
 * Ghi lại một lượt gõ sai.
 *
 * Dùng `upsert` cho từng khoá, và chấp nhận một chút thiếu chính xác khi hai
 * lượt gõ sai chạy song song: hỏng ở đây cùng lắm là đếm thiếu một lần, còn
 * dựng hẳn một khoá hàng chỉ để đếm cho chuẩn thì biến chính chỗ đăng nhập
 * thành nút thắt của cả trang.
 */
export async function ghiLanHong(dinhDanh: string): Promise<void> {
  const bay = new Date();
  const motCuaSoTruoc = new Date(bay.getTime() - CUA_SO_MS);

  for (const { khoa, toiDa } of khoaCua(dinhDanh, await layIp())) {
    try {
      const cu = await db.lanHong.findUnique({ where: { khoa }, select: { soLan: true, tuLuc: true } });

      // Cửa sổ cũ đã hết hạn thì đếm lại từ đầu, chứ không cộng dồn mãi —
      // cộng dồn thì một người gõ sai một lần mỗi tháng cũng có ngày bị cấm.
      const trongCuaSo = cu && cu.tuLuc > motCuaSoTruoc;
      const soLan = trongCuaSo ? cu.soLan + 1 : 1;

      await db.lanHong.upsert({
        where: { khoa },
        create: { khoa, soLan: 1, tuLuc: bay },
        update: {
          soLan,
          tuLuc: trongCuaSo ? cu.tuLuc : bay,
          camDen: soLan >= toiDa ? new Date(bay.getTime() + CAM_MS) : null,
        },
        select: { khoa: true },
      });
    } catch {
      // Đếm hỏng thì thôi. Không để việc đếm làm hỏng chính việc đăng nhập.
    }
  }
}

/** Đăng nhập đúng thì xoá sạch, để người thật chỉ phải chờ đúng một lần. */
export async function xoaLanHong(dinhDanh: string): Promise<void> {
  try {
    const khoa = khoaCua(dinhDanh, await layIp()).map((k) => k.khoa);
    await db.lanHong.deleteMany({ where: { khoa: { in: khoa } } });
  } catch { /* không quan trọng bằng việc cho người ta vào */ }
}

/* ──────────────────────────────────────────────────────────────────────────
 * CHẶN MỞ TÀI KHOẢN HÀNG LOẠT
 *
 * Cùng bảng đếm, khác khoá và khác ngưỡng. Lối đăng ký trước đây không có gì
 * chặn: một kịch bản bắn liên tục là dựng được hàng nghìn tài khoản, mỗi cái
 * ngốn một lượt bcrypt của máy chủ, rồi đem đi rải bài trên diễn đàn.
 *
 * Chỉ đếm theo IP — đăng ký thì chưa có định danh nào để mà đếm. Ngưỡng đặt
 * thấp vì mở tài khoản là việc hiếm: người thật mở một cái rồi thôi, cả nhà
 * cùng mạng cũng khó tới năm cái trong mười lăm phút.
 *
 * Đếm lượt MỞ ĐƯỢC, không đếm lượt gõ sai: gõ nhầm email ba lần rồi bị cấm
 * đăng ký là phạt đúng người thật, mà chẳng cản được kẻ bắn kịch bản.
 * ────────────────────────────────────────────────────────────────────────── */

const TOI_DA_DANG_KY = 5;

/** Khoá đếm đăng ký. Không có IP thì không đếm được — trả rỗng để nơi gọi bỏ qua. */
async function khoaDangKy(): Promise<string> {
  const ip = await layIp();
  return ip ? `dk:${ip.slice(0, 60)}` : '';
}

/** Hỏi trước khi tạo tài khoản: chỗ này còn được mở thêm không? */
export async function conDuocDangKy(): Promise<KetQuaChan> {
  const khoa = await khoaDangKy();
  if (!khoa) return { chan: false, conPhut: 0 };

  const bay = new Date();
  const hang = await db.lanHong.findFirst({
    where: { khoa, camDen: { gt: bay } }, select: { camDen: true },
  });
  if (!hang) return { chan: false, conPhut: 0 };

  return {
    chan: true,
    conPhut: Math.max(1, Math.ceil((hang.camDen!.getTime() - bay.getTime()) / 60_000)),
  };
}

/** Ghi một lượt mở tài khoản thành công. */
export async function ghiLanDangKy(): Promise<void> {
  const khoa = await khoaDangKy();
  if (!khoa) return;

  const bay = new Date();
  const motCuaSoTruoc = new Date(bay.getTime() - CUA_SO_MS);
  try {
    const cu = await db.lanHong.findUnique({ where: { khoa }, select: { soLan: true, tuLuc: true } });
    const trongCuaSo = cu && cu.tuLuc > motCuaSoTruoc;
    const soLan = trongCuaSo ? cu.soLan + 1 : 1;

    await db.lanHong.upsert({
      where: { khoa },
      create: { khoa, soLan: 1, tuLuc: bay },
      update: {
        soLan,
        tuLuc: trongCuaSo ? cu.tuLuc : bay,
        camDen: soLan >= TOI_DA_DANG_KY ? new Date(bay.getTime() + CAM_MS) : null,
      },
      select: { khoa: true },
    });
  } catch {
    // Đếm hỏng thì thôi — không để việc đếm chặn mất một lượt đăng ký thật.
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * CHẶN HỎI ẢNH ĐỘNG HÀNG LOẠT
 *
 * Tab GIF hỏi qua máy chủ của cửa hàng, và mỗi lượt hỏi tiêu một lượt trong
 * hạn ngạch của KHOÁ TRẢ TIỀN mà cửa hàng gắn ở khu cài đặt. Không chặn thì
 * một vòng lặp gõ vào ô tìm là đủ đốt hết hạn ngạch cả tháng, mà hoá đơn thì
 * của cửa hàng chứ không của người gõ.
 *
 * Trần rộng tay hơn trần tải ảnh: gõ tìm ảnh động là gõ vài chữ rồi đổi ý,
 * nên một người dùng thật chạm tới ba bốn chục lượt trong mười lăm phút là
 * chuyện bình thường.
 * ────────────────────────────────────────────────────────────────────────── */

const TOI_DA_GIF = 80;

export async function conDuocTimGif(nguoiId: string): Promise<KetQuaChan> {
  const bay = new Date();
  const hang = await db.lanHong.findFirst({
    where: { khoa: `gif:${nguoiId}`, camDen: { gt: bay } }, select: { camDen: true },
  });
  if (!hang) return { chan: false, conPhut: 0 };
  return {
    chan: true,
    conPhut: Math.max(1, Math.ceil((hang.camDen!.getTime() - bay.getTime()) / 60_000)),
  };
}

export async function ghiLanTimGif(nguoiId: string): Promise<void> {
  const khoa = `gif:${nguoiId}`;
  const bay = new Date();
  const motCuaSoTruoc = new Date(bay.getTime() - CUA_SO_MS);
  try {
    const cu = await db.lanHong.findUnique({ where: { khoa }, select: { soLan: true, tuLuc: true } });
    const trongCuaSo = cu && cu.tuLuc > motCuaSoTruoc;
    const soLan = trongCuaSo ? cu.soLan + 1 : 1;
    await db.lanHong.upsert({
      where: { khoa },
      create: { khoa, soLan: 1, tuLuc: bay },
      update: {
        soLan,
        tuLuc: trongCuaSo ? cu.tuLuc : bay,
        camDen: soLan >= TOI_DA_GIF ? new Date(bay.getTime() + CAM_MS) : null,
      },
      select: { khoa: true },
    });
  } catch {
    // Đếm hỏng thì thôi — không để việc đếm chặn mất một lượt tìm thật.
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * CHẶN TẢI ẢNH HÀNG LOẠT
 *
 * Ảnh là thứ NẶNG nhất một thành viên thường gửi lên được, và mỗi tấm là một
 * tệp nằm lại trong kho mãi mãi — xoá bài viết cũng không gỡ được nó ra, vì
 * ảnh nhúng trong chữ thì không có hàng nào trỏ tới.
 *
 * Đếm theo NGƯỜI chứ không theo IP: người tải ảnh thì phải đăng nhập rồi, nên
 * đã có một định danh thật để đếm; mà đếm theo IP thì cả quán net chung nhau
 * một hạn ngạch.
 * ────────────────────────────────────────────────────────────────────────── */

const TOI_DA_ANH = 30;

export async function conDuocDangAnh(nguoiId: string): Promise<KetQuaChan> {
  const bay = new Date();
  const hang = await db.lanHong.findFirst({
    where: { khoa: `anh:${nguoiId}`, camDen: { gt: bay } }, select: { camDen: true },
  });
  if (!hang) return { chan: false, conPhut: 0 };
  return {
    chan: true,
    conPhut: Math.max(1, Math.ceil((hang.camDen!.getTime() - bay.getTime()) / 60_000)),
  };
}

export async function ghiLanDangAnh(nguoiId: string): Promise<void> {
  const khoa = `anh:${nguoiId}`;
  const bay = new Date();
  const motCuaSoTruoc = new Date(bay.getTime() - CUA_SO_MS);
  try {
    const cu = await db.lanHong.findUnique({ where: { khoa }, select: { soLan: true, tuLuc: true } });
    const trongCuaSo = cu && cu.tuLuc > motCuaSoTruoc;
    const soLan = trongCuaSo ? cu.soLan + 1 : 1;
    await db.lanHong.upsert({
      where: { khoa },
      create: { khoa, soLan: 1, tuLuc: bay },
      update: {
        soLan,
        tuLuc: trongCuaSo ? cu.tuLuc : bay,
        camDen: soLan >= TOI_DA_ANH ? new Date(bay.getTime() + CAM_MS) : null,
      },
      select: { khoa: true },
    });
  } catch { /* đếm hỏng thì thôi, đừng chặn mất một lượt tải thật */ }
}

/* ──────────────────────────────────────────────────────────────────────────
 * CHẶN XIN MÃ ĐẶT LẠI MẬT KHẨU
 *
 * Cùng bảng đếm, khác khoá và khác ngưỡng. Lối xin mã tự động mở ra một cửa
 * mà mấy lối kia không có: nó khiến MÁY CHỦ CỦA TA gửi thư tới một địa chỉ do
 * người lạ gõ vào. Không chặn thì ai cũng biến chỗ này thành máy rải thư —
 * bắn một nghìn lượt vào hòm thư của một người là họ ngập, mà tên miền của
 * cửa hàng thì vào danh sách đen.
 *
 * ĐẾM CẢ LƯỢT XIN THÀNH CÔNG, khác hẳn lối đếm ở chỗ đăng nhập.
 *
 * Chỗ đăng nhập chỉ đếm lượt GÕ SAI, vì gõ đúng là việc bình thường và đếm nó
 * thì phạt người thật. Ở đây ngược lại: chính lượt "thành công" mới là lượt
 * tốn một lá thư, nên nó là thứ phải đếm. Một người quên mật khẩu xin hai ba
 * lượt là cùng; ai xin tới lượt thứ tư trong mười lăm phút thì không còn là
 * người quên mật khẩu nữa.
 *
 * Ngưỡng theo IP nới rộng hơn theo email, cùng lẽ với chỗ đăng nhập: quán net
 * và văn phòng ra ngoài bằng một địa chỉ.
 * ────────────────────────────────────────────────────────────────────────── */

const TOI_DA_XIN_MA_EMAIL = 3;
const TOI_DA_XIN_MA_IP = 12;

function khoaXinMa(email: string, ip: string): Khoa[] {
  const k: Khoa[] = [
    { khoa: `xm:${email.toLowerCase().slice(0, 100)}`, toiDa: TOI_DA_XIN_MA_EMAIL },
  ];
  if (ip) k.push({ khoa: `xmip:${ip.slice(0, 60)}`, toiDa: TOI_DA_XIN_MA_IP });
  return k;
}

/** Hỏi trước khi gửi thư: chỗ này còn được xin mã không? */
export async function conDuocXinMa(email: string): Promise<KetQuaChan> {
  const khoa = khoaXinMa(email, await layIp()).map((k) => k.khoa);
  const bay = new Date();

  const hang = await db.lanHong.findMany({
    where: { khoa: { in: khoa }, camDen: { gt: bay } },
    select: { camDen: true },
  });
  if (hang.length === 0) return { chan: false, conPhut: 0 };

  const lauNhat = Math.max(...hang.map((h) => h.camDen!.getTime()));
  return { chan: true, conPhut: Math.max(1, Math.ceil((lauNhat - bay.getTime()) / 60_000)) };
}

/**
 * Ghi một lượt xin mã.
 *
 * Gọi cho MỌI lượt xin, kể cả lượt gõ email không có tài khoản nào. Chỉ đếm
 * lượt có tài khoản thật thì kẻ dò biết ngay: xin mười lượt mà không bao giờ
 * bị chặn nghĩa là mười địa chỉ ấy đều chưa ai đăng ký.
 */
export async function ghiLanXinMa(email: string): Promise<void> {
  const bay = new Date();
  const motCuaSoTruoc = new Date(bay.getTime() - CUA_SO_MS);

  for (const { khoa, toiDa } of khoaXinMa(email, await layIp())) {
    try {
      const cu = await db.lanHong.findUnique({ where: { khoa }, select: { soLan: true, tuLuc: true } });
      const trongCuaSo = cu && cu.tuLuc > motCuaSoTruoc;
      const soLan = trongCuaSo ? cu.soLan + 1 : 1;

      await db.lanHong.upsert({
        where: { khoa },
        create: { khoa, soLan: 1, tuLuc: bay },
        update: {
          soLan,
          tuLuc: trongCuaSo ? cu.tuLuc : bay,
          camDen: soLan >= toiDa ? new Date(bay.getTime() + CAM_MS) : null,
        },
        select: { khoa: true },
      });
    } catch {
      // Đếm hỏng thì thôi, y như mấy chỗ đếm khác.
    }
  }
}
