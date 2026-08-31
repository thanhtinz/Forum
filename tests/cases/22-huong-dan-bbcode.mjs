import { BASE, openPage } from '../helpers.mjs';

/**
 * Trang hướng dẫn BBCode.
 *
 * Điều đáng kiểm nhất không phải là "trang có mở được không" mà là hướng dẫn
 * có nói đúng thứ máy chủ làm không: phần kết quả của mỗi mẫu do chính
 * `bbcodeToHtml` dựng, nên nếu mã đổi mà hướng dẫn quên sửa thì các mục dưới
 * đây kêu ngay.
 */
export default async function run(check) {
  const p = await openPage(null);
  await p.goto(`${BASE}/huong-dan/bbcode`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const html = await p.content();

  check('khách vãng lai xem được', html.includes('Hướng dẫn BBCode'));

  // Mẫu phải được DỰNG THẬT chứ không phải in ra chữ: có thẻ tương ứng.
  check('mẫu [b] dựng ra chữ đậm', html.includes('<strong>chữ đậm</strong>'));
  check('mẫu [color] dựng ra màu', html.includes('style="color:#e5484d"'));
  check('mẫu [quote=…] có tên người được trích', html.includes('<cite>Minh Dev</cite>'));
  check('mẫu [list] dựng ra danh sách', html.includes('<li>mục thứ nhất</li>'));
  check('mẫu [url] dựng ra liên kết', html.includes('href="https://example.com"'));

  // Ảnh mẫu phải nằm trong trang, không trỏ ra ngoài: trang hướng dẫn mà hiện
  // ô ảnh vỡ thì người đọc tưởng mã [img] hỏng.
  check('ảnh mẫu là ảnh nội bộ', html.includes('src="/logo-mau.svg"'));
  const anh = await p.request.get(`${BASE}/logo-mau.svg`);
  check('ảnh mẫu tải được', anh.status() === 200, `mã ${anh.status()}`);

  // Bảng điều kiện của [hide] phải liệt kê đủ các mức đang chạy.
  for (const ma of ['[hide=dangnhap]', '[hide=thich:20]', '[hide=traloi:10]', '[hide=cap:3]', '[hide=diem:50]']) {
    check(`bảng có nêu ${ma}`, html.includes(ma));
  }

  // Mẫu [hide] trên trang hướng dẫn phải hiện Ở TRẠNG THÁI KHOÁ, và ruột của
  // nó tuyệt đối không được nằm trong trang — hướng dẫn cách giấu mà chính nó
  // để lộ thì buồn cười.
  check('mẫu [hide] hiện dạng đã khoá', html.includes('Nội dung này bị ẩn — mở khoá bằng 50 điểm'));
  check('ruột mẫu [hide] không lọt vào trang', !html.includes('Link tải nằm ở đây'));

  // Lối vào: chân trang và ô soạn thảo đều phải dẫn tới đây.
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  check('chân trang có lối vào hướng dẫn',
    (await p.locator('footer a[href="/huong-dan/bbcode"]').count()) > 0);

  // Ô soạn bài: bảng trợ giúp phải dẫn sang trang hướng dẫn đầy đủ.
  const { db } = await import('../helpers.mjs');
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL', requiredMedalId: null }, select: { slug: true } });
  const poster = await openPage('minhdev');
  await poster.goto(`${BASE}/forum/${forum.slug}/new`, { waitUntil: 'networkidle' });
  await poster.waitForTimeout(600);
  await poster.click('button[title="Cú pháp BBCode"]');
  await poster.waitForTimeout(400);
  check('bảng trợ giúp ở ô soạn dẫn sang hướng dẫn',
    (await poster.locator('a[href="/huong-dan/bbcode"]').count()) > 0);
  check('bảng trợ giúp có nêu mã [hide] kèm điều kiện',
    (await poster.content()).includes('[hide=diem:50]'));
}
