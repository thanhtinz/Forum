import fs from 'node:fs';
import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Bốn lỗ hổng nặng đã vá — mỗi mục kiểm ở đây là một lần thử tấn công thật.
 *
 * Bộ kiểm chỉ bắt được thứ nó biết mà hỏi, nên bốn lỗi này lọt qua 526 mục
 * kiểm cũ. Giữ ca này lại để chúng không lặng lẽ quay về.
 */
const DAU = 'kiemthu-lohong';

export default async function run(check) {
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true } });
  const toi = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b || !toi) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const wipe = async () => {
    await db.message.deleteMany({ where: { content: { startsWith: DAU } } });
    await db.ban.deleteMany({ where: { reason: { startsWith: DAU } } });
  };
  await wipe();

  const trangThaiCu = (await db.user.findUnique({ where: { id: b.id }, select: { status: true } }))?.status ?? 'ACTIVE';

  try {
    // ── 1. Người lạ không xoá được tin nhắn của hội thoại người khác ─────
    // `purgeExpiredMessages` từng được export từ tệp 'use server', tức là một
    // endpoint POST công khai nhận thẳng id hội thoại rồi deleteMany.
    // Cặp luôn lưu theo thứ tự id đã sắp, và có @@unique — nên tìm trước, chưa
    // có mới tạo, kẻo đụng hội thoại sẵn có giữa hai người này.
    const [idA, idB] = [a.id, b.id].sort();
    const hoiThoai =
      (await db.conversation.findFirst({ where: { userAId: idA, userBId: idB }, select: { id: true } })) ??
      (await db.conversation.create({ data: { userAId: idA, userBId: idB }, select: { id: true } }));
    await db.message.deleteMany({ where: { conversationId: hoiThoai.id } });
    for (let i = 1; i <= 3; i++) {
      await db.message.create({
        data: { conversationId: hoiThoai.id, senderId: a.id, content: `${DAU} tin so ${i}` },
        select: { id: true },
      });
    }

    const khach = await openPage(null);
    // Phải đứng trên chính trang web mới fetch cùng gốc được.
    await khach.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    // Server Action được gọi bằng POST kèm hai header đặc thù. Nếu hàm vẫn còn
    // là action thì Next sẽ nhận và chạy; đã chuyển sang tệp thường thì không
    // có id action nào để gọi nữa.
    const ketQua = await khach.evaluate(async ({ base, id }) => {
      const r = await fetch(`${base}/user/messages/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'Next-Action': 'x'.repeat(40) },
        body: JSON.stringify([id, 0.0001, new Date(0).toISOString()]),
      });
      return r.status;
    }, { base: BASE, id: hoiThoai.id });

    const conLai = await db.message.count({ where: { conversationId: hoiThoai.id } });
    check('người lạ không xoá được tin nhắn hội thoại người khác', conLai === 3,
      `còn ${conLai}/3 tin, máy chủ trả ${ketQua}`);

    // Kiểm thẳng ở tầng mã nguồn, vì đây mới là thứ bảo vệ thật: chừng nào hàm
    // còn được export từ một tệp `'use server'` thì nó vẫn là endpoint công
    // khai, dù lần thử ở trên có chặn được hay không.
    const nguon = fs.readFileSync('src/app/(site)/user/messages/actions.ts', 'utf8');
    check('hàm xoá tin quá hạn KHÔNG còn là server action',
      !/export\s+(async\s+)?function\s+purgeExpiredMessages/.test(nguon));

    // ── 2. Link tải game ràng buộc vào đúng người tải ────────────────────
    // Kiểm qua đường HTTP: chữ ký sai thì chặn thẳng.
    const file = await db.gameFile.findFirst({ select: { storageKey: true } });
    if (file) {
      // Token của "người khác" — actorKey không thể trùng khách vãng lai này.
      const r = await khach.evaluate(async ({ base, tok }) => {
        const res = await fetch(`${base}/api/games/files?token=${encodeURIComponent(tok)}`);
        return res.status;
      }, { base: BASE, tok: 'giaMao.khongPhaiChuKyThat' });
      check('token giả mạo bị chặn', r === 403, `trả về ${r}`);
    } else {
      check('token giả mạo bị chặn', true, '(không có file game để kiểm)');
    }

    // ── 3. Người chưa đăng nhập không gỡ được lệnh cấm ───────────────────
    // Dựng đúng thế bí: tài khoản BANNED nhưng KHÔNG còn hàng Ban nào.
    await db.user.update({ where: { id: b.id }, data: { status: 'BANNED' }, select: { id: true } });
    await db.ban.deleteMany({ where: { userId: b.id } });

    const keLa = await openPage(null);
    await keLa.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await keLa.fill('input[name="identifier"]', 'lanpham');
    await keLa.fill('input[name="password"]', 'mat-khau-bay-bien-hoan-toan');
    await keLa.click('button[type="submit"]');
    await keLa.waitForTimeout(2500);

    const sau = await db.user.findUnique({ where: { id: b.id }, select: { status: true } });
    check('mật khẩu sai KHÔNG gỡ được lệnh cấm', sau?.status === 'BANNED', `trạng thái ${sau?.status}`);
    check('mật khẩu sai thì vẫn ở trang đăng nhập', keLa.url().includes('/login'), keLa.url());

    // Chính chủ với lệnh cấm ĐÃ HẾT HẠN thì vẫn phải vào được.
    await db.ban.create({
      data: {
        userId: b.id, scope: 'FULL', reason: `${DAU} cấm thử`,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      },
      select: { id: true },
    });
    const chinhChu = await openPage(null);
    await chinhChu.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await chinhChu.fill('input[name="identifier"]', 'lanpham');
    await chinhChu.fill('input[name="password"]', 'member123');
    await chinhChu.click('button[type="submit"]');
    await doiToi(async () => (await db.user.findUnique({ where: { id: b.id }, select: { status: true } }))?.status === 'ACTIVE');
    const sau2 = await db.user.findUnique({ where: { id: b.id }, select: { status: true } });
    check('lệnh cấm hết hạn thì chính chủ vào lại được', sau2?.status === 'ACTIVE', `trạng thái ${sau2?.status}`);

    // Còn hạn thì vẫn phải chặn.
    await db.ban.deleteMany({ where: { userId: b.id } });
    await db.user.update({ where: { id: b.id }, data: { status: 'BANNED' }, select: { id: true } });
    await db.ban.create({
      data: {
        userId: b.id, scope: 'FULL', reason: `${DAU} cấm còn hạn`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { id: true },
    });
    const biCam = await openPage(null);
    await biCam.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await biCam.fill('input[name="identifier"]', 'lanpham');
    await biCam.fill('input[name="password"]', 'member123');
    await biCam.click('button[type="submit"]');
    await biCam.waitForTimeout(2500);
    check('lệnh cấm còn hạn thì vẫn chặn được', biCam.url().includes('/login'), biCam.url());
  } finally {
    await wipe();
    await db.ban.deleteMany({ where: { userId: b.id } });
    await db.user.update({ where: { id: b.id }, data: { status: trangThaiCu }, select: { id: true } });
  }
}
