import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DAU = 'kiemthu-haitrang';

/**
 * HAI TRANG CỦA CỔNG TÁC GIẢ MÀ TRƯỚC ĐÂY KHÔNG BÀI NÀO MỞ TỚI.
 *
 * `/quan-ly/ho-so` và `/quan-ly/game/moi` — rà toàn bộ danh sách trang đối
 * chiếu với bộ kiểm thì đúng hai trang này ra con số không.
 *
 * Trang chưa bài nào mở thì không ai biết nó còn dựng được hay không: nó gãy
 * lặng lẽ, và chỉ lộ ra khi có một tác giả thật bấm vào rồi gặp trang trắng.
 *
 * `/quan-ly/game/moi` không tự kiểm quyền — nó trông cậy vào cổng chặn ở bố
 * cục `(tac-gia)/layout.tsx`. Lối ấy hợp quy ước của dự án, nhưng chính vì
 * KHÔNG có phép kiểm nào trong trang nên phải có bài kiểm canh cái cổng ấy:
 * gỡ nhầm một dòng trong bố cục là trang tạo game mở toang cho mọi người.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.game.deleteMany({ where: { duongDan: { startsWith: DAU } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: DAU } } });
  };
  await don();

  const mau = await db.nguoiDung.findFirst({
    orderBy: { id: 'asc' }, where: { tenDangNhap: 'huytran' }, select: { matKhauBam: true },
  });
  if (!mau) { kiem('có tài khoản mẫu', false); return; }

  let tacGia, thuong, khach;
  try {
    const ng = await db.nguoiDung.create({
      data: {
        email: `${DAU}@kiemthu.invalid`, tenDangNhap: DAU,
        tenHienThi: 'Tác giả hai trang', matKhauBam: mau.matKhauBam, vaiTro: 'TAC_GIA',
      },
      select: { id: true, tenDangNhap: true },
    });

    // ── CỔNG CHẶN: khách và thành viên thường đều không vào được ───────
    khach = await moTrang();
    for (const d of ['/quan-ly/ho-so', '/quan-ly/game/moi']) {
      await khach.goto(`${GOC}${d}`, { waitUntil: 'networkidle' });
      kiem(`khách vào ${d} thì bị đưa sang đăng nhập`,
        khach.url().includes('/dang-nhap'), khach.url());
    }

    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    for (const d of ['/quan-ly/ho-so', '/quan-ly/game/moi']) {
      await thuong.goto(`${GOC}${d}`, { waitUntil: 'networkidle' });
      kiem(`thành viên thường vào ${d} thì bị đẩy sang trang xin làm tác giả`,
        thuong.url().includes('/tac-gia/dang-ky'), thuong.url());
    }

    // ── Tác giả thật: hai trang phải DỰNG ĐƯỢC ─────────────────────────
    tacGia = await moTrangDaDangNhap(DAU, 'thanhvien123');

    const hs = await tacGia.goto(`${GOC}/quan-ly/ho-so`, { waitUntil: 'networkidle' });
    kiem('trang hồ sơ tác giả dựng được', hs.status() === 200, `máy trả ${hs.status()}`);
    kiem('và có ô nhập tên tác giả',
      (await tacGia.locator('input[name="tenTacGia"]').count()) === 1);
    kiem('và có lối sang trang công khai của chính mình',
      (await tacGia.locator(`a[href="/tac-gia/${ng.tenDangNhap}"]`).count()) >= 1);

    /*
     * Lưu hồ sơ rồi soi lại CSDL — không chỉ xem trang có vẽ ra hay không.
     * Đây là thứ người tải nhìn thấy ở trang tác giả, nên nó phải tới được
     * CSDL chứ không dừng ở trình duyệt.
     */
    const ten = `${DAU} tên bày ra ngoài`;
    await tacGia.fill('input[name="tenTacGia"]', ten);
    await tacGia.fill('textarea[name="gioiThieuTacGia"]', 'Mấy dòng tự giới thiệu.');
    await tacGia.click('button[type="submit"]');
    const daLuu = await doiToi(async () => {
      const x = await db.nguoiDung.findUnique({
        where: { id: ng.id }, select: { tenTacGia: true },
      });
      return x?.tenTacGia === ten;
    });
    kiem('lưu hồ sơ thì tên tác giả vào tới cơ sở dữ liệu', daLuu);

    await tacGia.goto(`${GOC}/tac-gia/${ng.tenDangNhap}`, { waitUntil: 'networkidle' });
    kiem('và tên ấy hiện ra ở trang công khai',
      (await tacGia.locator('body').innerText()).includes(ten));

    const gm = await tacGia.goto(`${GOC}/quan-ly/game/moi`, { waitUntil: 'networkidle' });
    kiem('trang thêm game của tác giả dựng được', gm.status() === 200, `máy trả ${gm.status()}`);
    kiem('và có ô nhập tên game',
      (await tacGia.locator('input[name="ten"]').count()) >= 1);

    /*
     * Ô "đưa lên băng nổi bật" CHỈ vẽ cho quản trị — trang này dùng chung biểu
     * mẫu với khu quản trị, nên chỗ dễ sai nhất là để lọt một ô của quản trị
     * sang cổng tác giả.
     */
    kiem('nhưng KHÔNG có ô dành riêng cho quản trị',
      (await tacGia.locator('input[name="noiBat"], [name="noiBat"]').count()) === 0);
  } finally {
    if (khach) await khach.close();
    if (thuong) await thuong.close();
    if (tacGia) await tacGia.close();
    await don();
  }
}
