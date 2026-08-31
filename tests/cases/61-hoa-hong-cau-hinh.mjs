import { BASE, db, doiToi, openPage } from '../helpers.mjs';
import { authorShareOf, chuanHoaHoaHong } from '../../src/lib/revenue-share.ts';

// Chép nguyên giá trị của `SITE_SETTING_KEY` trong `src/lib/site-const.ts`:
// tệp ấy kéo theo `revenue-share` lẫn kiểu của Prisma nên nạp thẳng từ `.mjs`
// không được, mà cả bài kiểm này chỉ cần đúng một chuỗi khoá.
const SITE_SETTING_KEY = 'site_general';

/**
 * Hoa hồng nền tảng nay chỉnh được ở trang Cài đặt chung.
 *
 * Trước đây `PLATFORM_COMMISSION_PERCENT = 30` là hằng số cứng trong mã, kèm
 * một dòng TODO: muốn đổi mức chia thì phải sửa mã rồi triển khai lại. Bài này
 * canh cả ba tầng — phép chia, chỗ lưu, và số điểm thật sự chảy vào ví tác giả
 * khi có người mở khối `[hide=diem:N]`.
 */
const TIEU_DE = 'Kiểm thử hoa hồng cấu hình';

export default async function run(check) {
  // ── Tầng phép tính ───────────────────────────────────────────────────
  check('mặc định vẫn là giữ lại 30%', authorShareOf(100) === 70, `${authorShareOf(100)}`);
  check('đổi mức thì chia theo mức mới', authorShareOf(100, 10) === 90, `${authorShareOf(100, 10)}`);
  check('giữ lại 0% thì tác giả nhận trọn', authorShareOf(100, 0) === 100);
  check('giữ lại 100% thì tác giả không nhận gì', authorShareOf(100, 100) === 0);
  check('mức vô lý bị kẹp lại chứ không sinh điểm âm hay điểm lạ',
    authorShareOf(100, -50) === 100 && authorShareOf(100, 500) === 0);
  check('luôn làm tròn xuống, không tự đẻ ra điểm lẻ', authorShareOf(45, 30) === 31, `${authorShareOf(45, 30)}`);

  check('giá trị rác trong cột Json về lại mặc định',
    chuanHoaHoaHong(undefined) === 30 && chuanHoaHoaHong('linh tinh') === 30 && chuanHoaHoaHong(null) === 30,
    `${chuanHoaHoaHong(undefined)} / ${chuanHoaHoaHong('linh tinh')} / ${chuanHoaHoaHong(null)}`);
  check('số ngoài khoảng bị kẹp về 0–100',
    chuanHoaHoaHong(-3) === 0 && chuanHoaHoaHong(240) === 100);
  check('số lẻ được làm tròn', chuanHoaHoaHong(12.6) === 13);

  // ── Tầng lưu và tầng tiền thật ───────────────────────────────────────
  const author = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const reader = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL', requiredMedalId: null }, select: { id: true, slug: true } });
  if (!author || !reader || !forum) { check('có dữ liệu mẫu', false, 'thiếu người dùng hoặc chuyên mục'); return; }

  const cuTru = await db.siteSetting.findUnique({ where: { key: SITE_SETTING_KEY } });
  const admin = await openPage('admin@nova.local', 'admin123');
  const doc = await openPage('huytran');

  try {
    await db.thread.deleteMany({ where: { title: { startsWith: TIEU_DE } } });

    // Admin đặt mức giữ lại 10% qua đúng biểu mẫu người ta bấm.
    await admin.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });
    const oHoaHong = admin.locator('input[name="hoaHongPhanTram"]');
    await doiToi(async () => (await oHoaHong.count()) > 0);
    check('trang cài đặt có ô hoa hồng', (await oHoaHong.count()) === 1);
    check('ô hoa hồng nạp sẵn mức đang dùng', (await oHoaHong.inputValue()) !== '');

    await oHoaHong.fill('10');
    await admin.locator('button:has-text("Lưu cài đặt")').click();
    await doiToi(async () => {
      const row = await db.siteSetting.findUnique({ where: { key: SITE_SETTING_KEY } });
      return row?.value?.hoaHongPhanTram === 10;
    });
    const daLuu = await db.siteSetting.findUnique({ where: { key: SITE_SETTING_KEY } });
    check('lưu được mức hoa hồng mới', daLuu?.value?.hoaHongPhanTram === 10,
      `đang là ${daLuu?.value?.hoaHongPhanTram}`);
    check('lưu hoa hồng không xoá mất tên trang', !!daLuu?.value?.name);

    // Mở một khối ẩn giá 50 điểm: tác giả phải nhận 45, không phải 35.
    const GIA = 50;
    const BIMAT = 'BIMAT-HOA-HONG-CAU-HINH';
    await db.user.update({ where: { id: reader.id }, data: { points: 500 } });
    const chuDe = await db.thread.create({
      data: {
        forumId: forum.id, authorId: author.id, status: 'PUBLISHED',
        title: `${TIEU_DE} — mở bằng điểm`,
        content: `<p>Xem đi:</p><!--hide:points:${GIA}--><p>${BIMAT}</p><!--/hide-->`,
        lastReplyAt: new Date(),
      },
      select: { id: true },
    });

    const viTruoc = (await db.user.findUnique({ where: { id: author.id }, select: { points: true } })).points;
    await doc.goto(`${BASE}/forum/${forum.slug}/${chuDe.id}`, { waitUntil: 'networkidle' });
    const nut = doc.locator('button:has-text("Dùng điểm để mở khoá")');
    await doiToi(async () => (await nut.count()) > 0);
    await nut.click();
    await doiToi(async () =>
      (await db.threadHideUnlock.count({ where: { userId: reader.id, threadId: chuDe.id } })) === 1);

    const viSau = (await db.user.findUnique({ where: { id: author.id }, select: { points: true } })).points;
    check('tác giả nhận đúng phần chia theo mức vừa đặt', viSau - viTruoc === 45,
      `nhận ${viSau - viTruoc}, đáng lẽ 45`);
    check('không còn chia theo mức 30% cũ trong mã', viSau - viTruoc !== 35);
  } finally {
    await db.thread.deleteMany({ where: { title: { startsWith: TIEU_DE } } });
    // Trả cài đặt về đúng như trước khi chạy, kể cả khi trước đó chưa có hàng nào.
    if (cuTru) {
      await db.siteSetting.update({ where: { key: SITE_SETTING_KEY }, data: { value: cuTru.value } });
    } else {
      await db.siteSetting.deleteMany({ where: { key: SITE_SETTING_KEY } });
    }
  }
}
