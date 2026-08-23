import { BASE, db, openPage } from '../helpers.mjs';

const SECRET_BODY = 'NOIDUNGAN-KIEMTHU-7788';
const SECRET_PASS = 'MATKHAU-KIEMTHU-9271';
const SECRET_CODE = 'MATRICHXUAT-KIEMTHU-4416';
const REAL_URL = 'https://vidu.test/tep-that-kiemthu.zip';
const PAID = 'kiem-thu-ro-ri-tra-phi';
const FREE = 'kiem-thu-bai-mien-phi-lien-quan';

/**
 * Nội dung đã trả tiền không được lọt vào mã nguồn trang.
 *
 * Truy vấn Prisma thiếu `select` ở cấp ngoài cùng sẽ kéo về mọi cột, và cả
 * object đó bị tuần tự hoá vào payload gửi xuống trình duyệt. Giao diện ẩn đi
 * nhưng người xem chỉ cần mở mã nguồn là đọc được.
 */
export default async function run(check) {
  const admin = await db.user.findFirst({ where: { username: 'admin' }, select: { id: true, username: true } });
  const cat = await db.category.findFirst({ select: { slug: true } });
  const tag = await db.tag.findFirst({ select: { id: true, slug: true } });

  await db.post.deleteMany({ where: { slug: { in: [PAID, FREE] } } });
  const paid = await db.post.create({
    data: {
      slug: PAID, title: 'Bài trả phí dùng để kiểm rò rỉ', content: '<p>Phần công khai.</p>',
      hiddenContent: `<p>${SECRET_BODY}</p>`, hiddenSource: SECRET_BODY,
      authorId: admin.id, status: 'PUBLISHED', access: 'POINTS', pricePoints: 999999,
      publishedAt: new Date(),
      categories: cat ? { create: [{ category: { connect: { slug: cat.slug } } }] } : undefined,
      tags: tag ? { create: [{ tag: { connect: { id: tag.id } } }] } : undefined,
      downloads: { create: [{ label: 'Bản đầy đủ', url: REAL_URL, password: SECRET_PASS, extractCode: SECRET_CODE, order: 0 }] },
    },
    select: { slug: true },
  });
  // Bài miễn phí cùng chuyên mục để khối "Bài viết liên quan" kéo bài trả phí vào
  await db.post.create({
    data: {
      slug: FREE, title: 'Bài miễn phí để kiểm khối liên quan', content: '<p>Công khai.</p>',
      authorId: admin.id, status: 'PUBLISHED', access: 'FREE',
      publishedAt: new Date(Date.now() - 60_000),
      categories: cat ? { create: [{ category: { connect: { slug: cat.slug } } }] } : undefined,
    },
    select: { id: true },
  });

  try {
    const guest = await openPage(null);
    const pages = [
      ['trang chi tiết bài trả phí', `/posts/${paid.slug}`],
      ['trang chi tiết bài khác (khối liên quan)', `/posts/${FREE}`],
      ['cửa hàng', '/shop'],
      ['chuyên mục', `/category/${cat?.slug ?? 'tin-tuc'}`],
      ['thẻ', `/tag/${tag?.slug ?? 'x'}`],
      ['trang cá nhân tác giả', `/u/${admin.username}`],
      ['blog', '/blog'],
      ['trang chủ', '/'],
      ['tìm kiếm', '/search?q=kiem+thu&tab=posts'],
    ];

    for (const [label, url] of pages) {
      const res = await guest.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
      const html = await guest.content();
      check(`${label}: không lộ nội dung ẩn`, !html.includes(SECRET_BODY));
      check(`${label}: không lộ mật khẩu tệp`, !html.includes(SECRET_PASS));
      check(`${label}: không lộ liên kết tải thật`, !html.includes(REAL_URL));
      check(`${label}: mở được`, res?.status() === 200, `HTTP ${res?.status()}`);
    }
    await guest.context().close();

    // Người CÓ quyền vẫn phải thấy đủ — vá rò rỉ không được làm hỏng bài đã mua
    const owner = await openPage('admin@nova.local', 'admin123');
    await owner.goto(`${BASE}/posts/${paid.slug}`, { waitUntil: 'networkidle' });
    await owner.waitForTimeout(500);
    check('tác giả thấy nội dung ẩn', (await owner.locator(`text=${SECRET_BODY}`).count()) > 0);
    check('tác giả thấy mật khẩu tệp', (await owner.locator(`text=${SECRET_PASS}`).count()) > 0);
    check('tác giả thấy mã trích xuất', (await owner.locator(`text=${SECRET_CODE}`).count()) > 0);
    check('tải qua cổng kiểm quyền, không phải liên kết thật',
      (await owner.locator('a[href*="/api/download/"]').count()) > 0);
    check('liên kết thật vẫn không lộ cho cả tác giả', !(await owner.content()).includes(REAL_URL));
    await owner.context().close();
  } finally {
    await db.post.deleteMany({ where: { slug: { in: [PAID, FREE] } } });
  }
}
