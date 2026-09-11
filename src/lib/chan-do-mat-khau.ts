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

/** Lấy IP người gọi. Không có thì trả rỗng — ở sau proxy lạ là chuyện có thật. */
async function layIp(): Promise<string> {
  const h = await headers();
  // `x-forwarded-for` là một dãy, cái ĐẦU là máy khách thật; mấy cái sau là
  // proxy trung gian. Lấy nhầm cái cuối là đếm chung cả proxy thành một.
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return h.get('x-real-ip')?.trim() ?? '';
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
