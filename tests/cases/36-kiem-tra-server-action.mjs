import bcrypt from 'bcryptjs';
import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Những phép kiểm bị bỏ sót ở server action.
 *
 * Bốn thứ khác nhau nhưng cùng một dạng: nút bấm trên giao diện có vẻ đúng, mà
 * việc thật xảy ra sau đó thì thiếu một câu kiểm.
 *
 *   • Trả lời một PHẢN HỒI đẻ ra bản ghi cấp ba mà trang chỉ dựng hai cấp — bài
 *     biến mất trước mắt người viết, trong khi điểm và bộ đếm vẫn tính.
 *   • Bài chủ đề không có trần độ dài, và sửa bài không kiểm lệnh cấm đăng.
 *   • Sửa câu lạc bộ mà biểu mẫu thiếu trường thì nhóm KÍN thành công khai.
 *   • Thưởng giới thiệu trả ngay lúc tạo tài khoản — tạo tài khoản trống chẳng
 *     tốn gì, nên đó là máy in điểm.
 */
const DAU = 'kiemthu-action';

export default async function run(check) {
  const chu = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const toi = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL', requiredMedalId: null }, select: { id: true, slug: true } });
  if (!chu || !toi || !forum) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const wipe = async () => {
    await db.thread.deleteMany({ where: { title: { startsWith: DAU } } });
    await db.ban.deleteMany({ where: { reason: { startsWith: DAU } } });
    await db.club.deleteMany({ where: { name: { startsWith: DAU } } });
    const ma = await db.user.findMany({ where: { username: { startsWith: 'kt36' } }, select: { id: true } });
    if (ma.length) {
      await db.pointsLog.deleteMany({ where: { refId: { in: ma.map((u) => u.id) } } });
      await db.user.deleteMany({ where: { id: { in: ma.map((u) => u.id) } } });
    }
  };
  await wipe();

  try {
    // ── Trả lời một phản hồi thì bài mới phải HIỆN RA ────────────────────
    const t = await db.thread.create({
      data: {
        forumId: forum.id, authorId: chu.id, status: 'PUBLISHED',
        title: `${DAU} chủ đề trả lời lồng`, content: '<p>Nội dung.</p>', lastReplyAt: new Date(),
      },
      select: { id: true },
    });
    const goc = await db.reply.create({
      data: { threadId: t.id, authorId: chu.id, content: `${DAU} tra loi goc` }, select: { id: true },
    });
    await db.reply.create({
      data: { threadId: t.id, authorId: chu.id, content: `${DAU} phan hoi cap hai`, parentId: goc.id },
      select: { id: true },
    });
    await db.thread.update({ where: { id: t.id }, data: { replyCount: 2 }, select: { id: true } });

    const p = await openPage('huytran');
    const trangChuDe = `${BASE}/forum/${forum.slug}/${t.id}`;
    const mo = async () => {
      await p.goto(trangChuDe, { waitUntil: 'networkidle' });
      await p.waitForTimeout(900);
    };
    await mo();

    // Bấm "Trả lời" ngay trên PHẢN HỒI cấp hai — đúng chỗ trước đây sinh ra bản
    // ghi cấp ba không bao giờ hiện ra.
    const khoiCapHai = p.locator('[id^="bai-"]').filter({ hasText: 'phan hoi cap hai' }).first();
    const coNut = (await khoiCapHai.locator('button:has-text("Trả lời")').count()) > 0;
    check('phản hồi cấp hai có nút trả lời', coNut);
    if (coNut) {
      await khoiCapHai.locator('button:has-text("Trả lời")').first().click();
      await p.waitForTimeout(500);
      await khoiCapHai.locator('textarea[name="content"]').fill(`${DAU} bai moi phai hien ra`);
      await khoiCapHai.locator('button[type="submit"]').first().click();

      const moi = await doiToi(() => db.reply.findFirst({
        where: { threadId: t.id, content: { contains: 'bai moi phai hien ra' } },
        select: { id: true, parentId: true },
      }));
      check('bài trả lời được ghi lại', !!moi);
      check('bài mới gập về gốc nhánh chứ không lồng thêm tầng',
        moi?.parentId === goc.id, `parentId đang là ${moi?.parentId}`);

      await mo();
      const hienRa = (await p.locator('text=bai moi phai hien ra').count()) > 0;
      check('bài mới HIỆN RA trên trang chứ không rơi mất', hienRa);
    }

    // ── Trần độ dài bài chủ đề ───────────────────────────────────────────
    // Gửi thẳng biểu mẫu: ô soạn có `maxLength` nhưng thuộc tính ấy chỉ là gợi ý
    // của trình duyệt, ai cũng bỏ qua được.
    const daiQua = 'x'.repeat(20001);
    await p.goto(`${BASE}/forum/${forum.slug}/new`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const soTruoc = await db.thread.count({ where: { title: { startsWith: DAU } } });
    await p.evaluate(({ dai, dau }) => {
      const ta = document.querySelector('textarea[name="content"]');
      const ti = document.querySelector('input[name="title"]');
      if (!ta || !ti) return;
      // Đặt giá trị qua bộ setter gốc để React nhận ra thay đổi.
      const dat = (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      dat(ti, `${dau} bài dài quá mức`);
      ta.removeAttribute('maxlength');
      dat(ta, dai);
    }, { dai: daiQua, dau: DAU });
    await p.locator('button[type="submit"]').first().click();
    await p.waitForTimeout(2500);
    check('bài quá dài không được ghi vào cơ sở dữ liệu',
      (await db.thread.count({ where: { title: { startsWith: DAU } } })) === soTruoc);
    check('có báo lỗi độ dài cho người dùng',
      (await p.locator('text=Nội dung tối đa').count()) > 0);

    // ── Cấm đăng bài thì cũng không sửa được bài cũ ──────────────────────
    const cua = await db.thread.create({
      data: {
        forumId: forum.id, authorId: toi.id, status: 'PUBLISHED',
        title: `${DAU} bài của người bị cấm`, content: '<p>Nội dung gốc.</p>',
        contentSource: 'Nội dung gốc.', lastReplyAt: new Date(),
      },
      select: { id: true },
    });
    await db.ban.create({
      data: { userId: toi.id, scope: 'POST', reason: `${DAU} cấm đăng bài`, expiresAt: null },
      select: { id: true },
    });
    await p.goto(`${BASE}/forum/${forum.slug}/${cua.id}/sua`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const coO = (await p.locator('textarea[name="content"]').count()) > 0;
    if (coO) {
      await p.evaluate(() => {
        const ta = document.querySelector('textarea[name="content"]');
        const setter = Object.getOwnPropertyDescriptor(ta.constructor.prototype, 'value').set;
        setter.call(ta, 'Nội dung đã bị sửa sau khi bị cấm.');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await p.locator('button[type="submit"]').first().click();
      // Ngủ cứng ở đây là ĐÚNG: mục kiểm này khẳng định bài KHÔNG đổi. Không
      // chờ được một việc không xảy ra — đổi sang `doiToi` thì lượt nào cũng
      // ngồi hết hạn rồi mới đi tiếp, mà kết luận vẫn y hệt.
      await p.waitForTimeout(2500);
    }
    const sauKhiSua = await db.thread.findUnique({
      where: { id: cua.id }, select: { contentSource: true },
    });
    check('người bị cấm đăng bài không sửa được bài cũ',
      sauKhiSua?.contentSource === 'Nội dung gốc.', `đang là ${sauKhiSua?.contentSource}`);
    await db.ban.deleteMany({ where: { reason: { startsWith: DAU } } });

    // ── Sửa câu lạc bộ thiếu trường thì giữ nguyên mức riêng tư ──────────
    // Không có đường nào qua giao diện để gửi thiếu trường, nên gọi thẳng server
    // action bằng biểu mẫu tự dựng — đúng cách một kẻ tấn công sẽ làm.
    const clb = await db.club.create({
      data: {
        name: `${DAU} nhóm kín`, slug: `${DAU}-nhom-kin`, ownerId: toi.id,
        privacy: 'MEMBERS', joinMode: 'APPROVAL',
      },
      select: { id: true, slug: true },
    });
    // Chủ nhóm phải có hàng thành viên ACTIVE thì bảng quản lý mới hiện — lập
    // nhóm qua giao diện tự tạo hàng này.
    await db.clubMember.create({
      data: { clubId: clb.id, userId: toi.id, role: 'OWNER', status: 'ACTIVE' },
      select: { id: true },
    });
    await p.goto(`${BASE}/clb/${clb.slug}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    await p.locator('button:has-text("Cài đặt câu lạc bộ")').first().click();
    await p.waitForTimeout(500);
    const coBieuMau = (await p.locator('select[name="privacy"]').count()) > 0;
    check('chủ nhóm mở được biểu mẫu cài đặt', coBieuMau);
    if (coBieuMau) {
      // Gỡ hẳn hai ô chọn khỏi biểu mẫu rồi mới bấm Lưu — đúng thứ xảy ra khi ô
      // bị `disabled` (trình duyệt không gửi field bị disable) hoặc khi sau này
      // có một biểu mẫu sửa từng phần. Server phải GIỮ giá trị đang có.
      await p.evaluate(() => {
        for (const ten of ['privacy', 'joinMode']) {
          document.querySelector(`select[name="${ten}"]`)?.remove();
        }
      });
      await p.locator('button:has-text("Lưu thay đổi")').first().click();
      await p.waitForTimeout(2500);
    }
    const sauClb = await db.club.findUnique({ where: { id: clb.id }, select: { privacy: true, joinMode: true } });
    check('sửa thiếu trường KHÔNG biến nhóm kín thành công khai',
      sauClb?.privacy === 'MEMBERS', `đang là ${sauClb?.privacy}`);
    check('cách vào nhóm cũng giữ nguyên',
      sauClb?.joinMode === 'APPROVAL', `đang là ${sauClb?.joinMode}`);

    // ── Thưởng giới thiệu: chỉ trả khi người được mời đăng bài đầu tiên ──
    const moiVao = await db.user.create({
      data: {
        username: 'kt36moi', email: 'kt36moi@nova.local', name: 'Kiểm thử mời',
        passwordHash: await bcrypt.hash('member123', 10),
        invitedById: chu.id, inviteCode: 'KT36MOI',
      },
      select: { id: true },
    });
    const diemTruoc = await db.pointsLog.count({
      where: { userId: chu.id, reason: 'INVITE_BONUS', refId: moiVao.id },
    });
    check('tạo tài khoản KHÔNG tự sinh điểm thưởng cho người mời', diemTruoc === 0,
      `đã ghi ${diemTruoc} lần`);

    // Người được mời đăng bài đầu tiên → người mời mới nhận điểm.
    const bai1 = await db.thread.create({
      data: {
        forumId: forum.id, authorId: moiVao.id, status: 'PUBLISHED',
        title: `${DAU} bài đầu tiên của người được mời`, content: '<p>Chào cả nhà.</p>',
        lastReplyAt: new Date(),
      },
      select: { id: true },
    });
    // Gọi thẳng đường thưởng bằng cách trả lời qua giao diện thì nhanh hơn, nhưng
    // ở đây kiểm chính cái hàm: đăng bài xong là thưởng, đăng tiếp không thưởng nữa.
    const moiP = await openPage('kt36moi@nova.local');
    await moiP.goto(`${BASE}/forum/${forum.slug}/${bai1.id}`, { waitUntil: 'networkidle' });
    await moiP.waitForTimeout(800);
    const oTraLoi = moiP.locator('textarea[name="content"]').first();
    if ((await oTraLoi.count()) > 0) {
      await oTraLoi.fill(`${DAU} tra loi dau tien cua nguoi duoc moi`);
      await moiP.locator('button[type="submit"]').first().click();
      await doiToi(async () => (await db.pointsLog.count({
        where: { userId: chu.id, reason: 'INVITE_BONUS', refId: moiVao.id },
      })) > 0);
    }
    const sauBai = await db.pointsLog.count({
      where: { userId: chu.id, reason: 'INVITE_BONUS', refId: moiVao.id },
    });
    check('đăng bài đầu tiên thì người mời nhận điểm', sauBai === 1, `ghi ${sauBai} lần`);

    // Bài thứ hai không được thưởng thêm lần nữa.
    await moiP.reload({ waitUntil: 'networkidle' });
    await moiP.waitForTimeout(800);
    const o2 = moiP.locator('textarea[name="content"]').first();
    if ((await o2.count()) > 0) {
      await o2.fill(`${DAU} tra loi thu hai cua nguoi duoc moi`);
      await moiP.locator('button[type="submit"]').first().click();
      await moiP.waitForTimeout(2500);
    }
    const sauBai2 = await db.pointsLog.count({
      where: { userId: chu.id, reason: 'INVITE_BONUS', refId: moiVao.id },
    });
    check('bài thứ hai KHÔNG thưởng thêm lần nữa', sauBai2 === 1, `ghi ${sauBai2} lần`);
  } finally {
    await wipe();
  }
}
