import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * Hai thứ không nhìn thấy trên giao diện, nên chỉ bài kiểm mới canh được:
 * sơ đồ trang cho máy tìm kiếm, và cửa chặn dò mật khẩu.
 */
export default async function chay(kiem) {
  // ── robots.txt ────────────────────────────────────────────────────────
  const robots = await (await fetch(`${GOC}/robots.txt`)).text();
  kiem('robots.txt cho bò vào phần công khai', /Allow: \/$/m.test(robots));
  kiem('robots.txt chặn khu quản trị', robots.includes('Disallow: /quan-tri'));
  kiem('robots.txt chặn mấy trang cá nhân',
    robots.includes('Disallow: /toi') && robots.includes('Disallow: /thu-vien'));
  kiem('robots.txt chỉ đường tới sơ đồ trang', /Sitemap: https?:\/\/\S+\/sitemap\.xml/.test(robots));

  // ── sitemap.xml ───────────────────────────────────────────────────────
  const sm = await fetch(`${GOC}/sitemap.xml`);
  kiem('sitemap.xml tải được', sm.ok, `mã ${sm.status}`);
  const xml = await sm.text();

  const game = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'DANG_HIEN' }, select: { duongDan: true },
  });
  kiem('sơ đồ trang có trang game đang hiện',
    xml.includes(`/game/${game.duongDan}<`), game.duongDan);

  /*
   * Game NHÁP không được lọt vào sơ đồ.
   *
   * Lọt thì máy tìm kiếm đi bò vào một đường dẫn trả 404, và lần sau nó bớt
   * tin cả sơ đồ — mà cái hại ấy không hiện ra ở đâu trên giao diện cả.
   */
  const nhap = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'NHAP' }, select: { duongDan: true },
  });
  if (nhap) {
    kiem('game nháp KHÔNG lọt vào sơ đồ trang',
      !xml.includes(`/game/${nhap.duongDan}<`), nhap.duongDan);
  }

  kiem('sơ đồ trang không có trang kết quả lọc',
    !xml.includes('sap=') && !xml.includes('trang='),
    'mấy tổ hợp lọc sinh ra hàng nghìn địa chỉ trùng nội dung');

  // `lastmod` phải là ngày sửa THẬT, không phải lúc nào cũng "vừa xong".
  const mod = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  kiem('sơ đồ trang có mốc sửa đổi', mod.length > 0, `${mod.length} mốc`);
  kiem('mốc sửa đổi không phải đúng lúc này',
    mod.every((m) => Date.now() - new Date(m).getTime() > 1000),
    'nếu mọi mốc đều là hiện tại thì con số ấy vô nghĩa');

  // ── Cửa chặn dò mật khẩu ──────────────────────────────────────────────
  const AI = 'anhthu';
  await db.lanHong.deleteMany({});

  const p = await moTrang();
  try {
    const thuSai = async () => {
      await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
      await p.fill('input[name="dinhDanh"]', AI);
      await p.fill('input[name="matKhau"]', 'chac-chan-sai-roi');
      await p.click('button[type="submit"]');
      await p.waitForTimeout(400);
      return (await p.locator('[role="alert"]').first().textContent()) ?? '';
    };

    // Vài lần đầu chỉ báo sai thường, chưa cấm.
    const lanDau = await thuSai();
    kiem('gõ sai thì báo sai', lanDau.length > 0, lanDau);
    kiem('lần đầu chưa bị cấm', !lanDau.includes('Thử lại sau'), lanDau);

    kiem('mỗi lần gõ sai đều được ghi lại',
      (await db.lanHong.count({ where: { khoa: `dd:${AI}` } })) === 1);

    // Gõ sai cho đủ ngưỡng.
    let cuoi = lanDau;
    for (let i = 0; i < 8 && !cuoi.includes('Thử lại sau'); i++) cuoi = await thuSai();

    kiem('gõ sai quá nhiều thì bị cấm tạm', cuoi.includes('Thử lại sau'), cuoi);
    kiem('câu báo nói rõ còn phải chờ bao lâu', /\d+ phút/.test(cuoi), cuoi);

    const hang = await db.lanHong.findUnique({
      where: { khoa: `dd:${AI}` }, select: { soLan: true, camDen: true },
    });
    kiem('ghi đủ số lần gõ sai', (hang?.soLan ?? 0) >= 8, `đếm ${hang?.soLan}`);
    kiem('có đặt mốc hết cấm', hang?.camDen != null && hang.camDen > new Date());

    /*
     * Đang bị cấm thì GÕ ĐÚNG cũng không vào được.
     *
     * Đây là mục quan trọng nhất: cửa chặn phải nằm TRƯỚC lượt so mật khẩu,
     * không thì kẻ dò vẫn bắt máy chủ chạy bcrypt cho từng lượt thử — và bcrypt
     * cố ý chạy chậm, nên chính nó thành chỗ để đánh sập máy chủ.
     */
    await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await p.fill('input[name="dinhDanh"]', AI);
    await p.fill('input[name="matKhau"]', 'thanhvien123');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(600);
    kiem('đang bị cấm thì mật khẩu đúng cũng chưa vào được',
      p.url().includes('/dang-nhap'), p.url());

    // ── Gỡ cấm rồi thì vào được, và bộ đếm xoá sạch ───────────────────
    await db.lanHong.deleteMany({});
    await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await p.fill('input[name="dinhDanh"]', AI);
    await p.fill('input[name="matKhau"]', 'thanhvien123');
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !u.pathname.includes('/dang-nhap'), { timeout: 10_000 });
    kiem('hết cấm thì đăng nhập đúng vào được', !p.url().includes('/dang-nhap'), p.url());

    kiem('đăng nhập đúng thì xoá sạch bộ đếm',
      (await db.lanHong.count()) === 0, `còn ${await db.lanHong.count()} hàng`);
  } finally {
    // Phải dọn bằng được: một hàng cấm theo IP còn sót là MỌI bài chạy sau
    // đều không đăng nhập nổi, và chúng sẽ đỏ vì một lẽ chẳng liên quan gì.
    await db.lanHong.deleteMany({});
    await p.close();
  }
}
