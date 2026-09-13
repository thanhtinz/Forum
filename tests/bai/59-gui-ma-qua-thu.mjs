import { GOC, db, doiToi, moTrang } from '../tro-giup.mjs';
import { docThan, moThuGia } from '../thu-gia.mjs';
import { donMa } from '../../src/lib/dat-lai-const.ts';

const TEN = 'kiemthu-thu';
const EMAIL = `${TEN}@kiemthu.local`;
const CU = 'thanhvien123';
const MOI = 'matkhauquathub9';

/**
 * XIN MÃ ĐẶT LẠI QUA THƯ.
 *
 * Lối này mở ra một cửa mà mấy lối kia không có: nó khiến MÁY CHỦ CỦA TA gửi
 * thư tới một địa chỉ do người lạ gõ vào. Nên ngoài chuyện "có chạy không",
 * bài này canh hai chỗ nữa, và cả hai đều là chuyện an toàn:
 *
 *   • KHÔNG NÓI RA email nào có tài khoản. Trả lời khác nhau là biến chỗ này
 *     thành máy dò danh sách thành viên.
 *   • CÓ CỬA CHẶN. Không chặn thì ai cũng biến nó thành máy rải thư, và tên
 *     miền của cửa hàng vào danh sách đen.
 *
 * Thư gửi vào một máy chủ GIẢ dựng ngay tại đây — bài kiểm tuyệt đối không
 * được bắn thư thật ra ngoài. Cổng 2525 khớp với cổng mà `kiem-tren-ban-dung`
 * trỏ máy chủ sang.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: TEN } } });
    /*
     * Dọn CẢ khoá đếm theo IP, không chỉ khoá theo email.
     *
     * Bài này cố ý bắn tới khi bị chặn, nên nó để lại mấy hàng đếm còn hiệu
     * lực mười lăm phút. Dọn theo TIỀN TỐ chứ không theo tên bài: một trong hai
     * email bài này gõ vào là địa chỉ bịa không mang tên bài, còn khoá theo IP
     * thì mang địa chỉ máy. Dọn thiếu là lượt chạy sau mở màn đã bị cấm sẵn,
     * rồi đỏ ở một chỗ hoàn toàn đúng — đã dính thật hai lần.
     */
    await db.lanHong.deleteMany({
      where: { OR: [{ khoa: { startsWith: 'xm:' } }, { khoa: { startsWith: 'xmip:' } }] },
    });
  };
  await don();

  const hom = moThuGia(2525);
  let p;
  try {
    await hom.san;

    const bcrypt = (await import('bcryptjs')).default;
    const nguoi = await db.nguoiDung.create({
      data: {
        tenDangNhap: TEN, tenHienThi: 'Người xin mã qua thư',
        email: EMAIL, matKhauBam: await bcrypt.hash(CU, 10),
      },
      select: { id: true },
    });

    p = await moTrang();
    await p.goto(`${GOC}/quen-mat-khau`, { waitUntil: 'networkidle' });

    const coO = (await p.locator('input[name="email"]').count()) > 0;
    kiem('khai cấu hình thư thì trang bày ô nhập email', coO,
      (await p.locator('main').textContent()).slice(0, 160));
    if (!coO) return;

    const xin = async (email) => {
      await p.goto(`${GOC}/quen-mat-khau`, { waitUntil: 'networkidle' });
      await p.fill('input[name="email"]', email);
      await p.click('button:has-text("Gửi mã vào email")');
      await p.waitForTimeout(1200);
      return (await p.locator('main').textContent()) ?? '';
    };

    /* ── Email KHÔNG có tài khoản: vẫn nói y hệt, và không gửi thư ────── */
    const chuLa = await xin('khong-ai-dung-dia-chi-nay@kiemthu.local');
    kiem('email lạ vẫn nhận câu trả lời "đã gửi"', chuLa.includes('Đã gửi'), chuLa.slice(0, 160));
    kiem('nhưng không có lá thư nào bay đi', hom.thu.length === 0, `${hom.thu.length} thư`);

    /* ── Email có tài khoản: thư tới, mang đúng đường dẫn ─────────────── */
    const chuThat = await xin(EMAIL);
    kiem('email có tài khoản nhận đúng câu trả lời ấy', chuThat.includes('Đã gửi'));

    const daToi = await doiToi(async () => hom.thu.length === 1);
    kiem('thư bay tới máy chủ thư', daToi, `${hom.thu.length} thư`);
    if (!daToi) return;

    const la = hom.thu[0];
    kiem('thư gửi đúng địa chỉ đã đăng ký', la.toi === EMAIL, la.toi);

    // Thân thư đi trên đường dưới dạng đã bọc (`quoted-printable` hoặc
    // `base64`) vì chữ tiếng Việt có dấu — phải giải ra mới soi được.
    const chuThu = docThan(la.than);
    kiem('thư mang tên người nhận', chuThu.includes('Người xin mã qua thư'),
      chuThu.slice(0, 160));
    kiem('thư nói rõ bỏ qua được nếu không phải mình xin',
      chuThu.includes('Nếu không phải bạn xin'));

    const dan = (chuThu.match(/https?:\/\/\S*dat-lai-mat-khau\?ma=\S+/) ?? [])[0] ?? '';
    kiem('thư có đường dẫn đặt lại', !!dan, chuThu.slice(0, 200));
    if (!dan) return;

    const ma = decodeURIComponent(dan.split('ma=')[1]);
    kiem('mã trong thư KHÔNG nằm thẳng trong cơ sở dữ liệu', await (async () => {
      const hang = await db.maDatLai.findFirst({
        where: { nguoiId: nguoi.id }, select: { ma: true },
      });
      return !!hang && hang.ma !== donMa(ma);
    })());

    /* ── Mã trong thư dùng được thật ──────────────────────────────────── */
    await p.goto(dan.replace(/^https?:\/\/[^/]+/, GOC), { waitUntil: 'networkidle' });
    await p.fill('input[name="matKhau"]', MOI);
    await p.fill('input[name="nhacLai"]', MOI);
    await p.click('button:has-text("Đặt lại mật khẩu")');
    await p.waitForTimeout(1200);

    const sau = await db.nguoiDung.findUnique({
      where: { id: nguoi.id }, select: { matKhauBam: true },
    });
    kiem('mã trong thư đổi được mật khẩu thật', await bcrypt.compare(MOI, sau.matKhauBam));

    /* ── Cửa chặn: xin quá nhiều thì bị cấm một lúc ───────────────────── */
    let chan = '';
    for (let i = 0; i < 4 && !chan.includes('Thử lại sau'); i++) {
      const r = await xin(EMAIL);
      if (r.includes('Thử lại sau')) chan = r;
    }
    kiem('xin quá nhiều lần thì bị chặn một lúc', chan.includes('Thử lại sau'),
      chan.slice(0, 160));
    kiem('bị chặn thì KHÔNG gửi thêm thư nữa', hom.thu.length <= 4, `${hom.thu.length} thư`);
  } finally {
    await don();
    await p?.close();
    await hom.dong();
  }
}
