import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Thẻ viết tắt câu lạc bộ đeo cạnh tên.
 *
 * Cái thẻ này khác mọi món trang trí khác ở chỗ nó KHÔNG nằm trên hàng người
 * dùng: nó lấy từ nhóm mà người ấy đang là thành viên. Nên ba chỗ dễ hỏng:
 *   • vào nhóm thì thẻ phải hiện, rời nhóm thì phải mất — không cần ai bấm gì,
 *   • một người ở nhiều nhóm thì chỉ hiện MỘT thẻ, và phải là nhóm mình làm chủ,
 *   • viết tắt là duy nhất toàn site, hai nhóm không được trùng — trùng thì cái
 *     thẻ chẳng còn chỉ ra được nhóm nào.
 */
const DAU = 'kiemthu-the-clb';

export default async function run(check) {
  const chu = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const toi = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!chu || !toi) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  // Viết tắt là DUY NHẤT toàn site, nên bài kiểm phải dùng chuỗi không ai đặt
  // trùng, và dọn theo cả viết tắt — chỉ dọn theo tên thì một lần chạy hỏng
  // giữa chừng là mọi lần sau đều vướng "viết tắt đã có nhóm dùng rồi".
  const TAT = 'KT37A';
  const TAT2 = 'KT37B';
  const wipe = async () => {
    await db.club.deleteMany({
      where: { OR: [{ name: { startsWith: DAU } }, { shortName: { in: [TAT, TAT2] } }] },
    });
  };
  await wipe();

  // Lập nhóm tốn điểm, mà số điểm của người kiểm thì bài kiểm khác đụng vào
  // liên tục — nạp đủ trước, trả lại như cũ ở cuối.
  const diemCu = (await db.user.findUnique({ where: { id: toi.id }, select: { points: true } }))?.points ?? 0;
  await db.user.update({ where: { id: toi.id }, data: { points: 100000 }, select: { id: true } });

  const p = await openPage('huytran');

  try {
    // ── Lập nhóm qua giao diện, có ô viết tắt ────────────────────────────
    await p.goto(`${BASE}/clb`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    await p.locator('button:has-text("Lập câu lạc bộ")').first().click();
    await p.waitForTimeout(500);

    const coO = (await p.locator('input[name="shortName"]').count()) > 0;
    check('biểu mẫu lập nhóm có ô viết tắt', coO);
    if (!coO) return;

    // Gõ tên thì ô viết tắt tự đoán theo chữ đầu mỗi từ.
    await p.fill('input[name="name"]', `${DAU} Hoi Me Game Java`);
    await p.waitForTimeout(400);
    const doan = await p.inputValue('input[name="shortName"]');
    check('gõ tên thì viết tắt tự đoán theo chữ đầu', doan.length >= 2, `đoán ra “${doan}”`);

    await p.fill('input[name="shortName"]', TAT.toLowerCase());
    await p.locator('form button:has-text("Lập câu lạc bộ")').click();
    await doiToi(async () => (await db.club.count({ where: { name: { startsWith: DAU } } })) > 0);

    const clb = await db.club.findFirst({
      where: { name: { startsWith: DAU } }, select: { id: true, slug: true, shortName: true },
    });
    check('lập được nhóm', !!clb);
    if (!clb) return;
    check('viết tắt được chuẩn hoá về chữ hoa', clb.shortName === TAT, `đang là ${clb.shortName}`);

    // ── Thẻ hiện cạnh tên ở danh bạ ──────────────────────────────────────
    const doThe = async (url) => {
      await p.goto(BASE + url, { waitUntil: 'networkidle' });
      await p.waitForTimeout(900);
      return p.evaluate(() => {
        const khoi = [...document.querySelectorAll('span.inline-flex')]
          .find((e) => e.textContent?.includes('Huy Trần'));
        return khoi ? khoi.textContent.trim() : null;
      });
    };
    const hang = await doThe('/thanh-vien');
    check('thẻ viết tắt hiện cạnh tên ở danh bạ', !!hang && hang.includes(`[${TAT}]`), String(hang));

    check('thẻ dẫn sang trang nhóm',
      (await p.locator(`a[href="/clb/${clb.slug}"]:has-text("[${TAT}]")`).count()) > 0);

    // ── Thứ tự: thẻ đứng sau danh hiệu, trước huy hiệu ───────────────────
    const thuTu = await p.evaluate(() => {
      const khoi = [...document.querySelectorAll('span.inline-flex')]
        .find((e) => e.textContent?.includes('Huy Trần'));
      if (!khoi) return null;
      return [...khoi.children].map((e) => {
        const t = (e.textContent ?? '').trim();
        if (/^Lv\d+$/.test(t)) return 'lv';
        if (/^\[[A-Z0-9]+\]$/.test(t)) return 'clb';
        return t ? 'chu' : 'khac';
      });
    });
    check('thẻ nhóm đứng sau cấp độ', !!thuTu && thuTu.indexOf('lv') < thuTu.indexOf('clb'),
      JSON.stringify(thuTu));

    // ── Viết tắt là duy nhất ─────────────────────────────────────────────
    const truoc = await db.club.count();
    await p.goto(`${BASE}/clb`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await p.locator('button:has-text("Lập câu lạc bộ")').first().click();
    await p.waitForTimeout(400);
    await p.fill('input[name="name"]', `${DAU} nhom trung viet tat`);
    await p.fill('input[name="shortName"]', TAT);
    await p.locator('form button:has-text("Lập câu lạc bộ")').click();
    await p.waitForTimeout(2500);
    check('viết tắt trùng thì bị chặn', (await db.club.count()) === truoc);
    check('có báo cho người dùng biết vì sao',
      (await p.locator('text=đã có nhóm').count()) > 0);

    // ── Thành viên thường cũng đeo thẻ, rời nhóm thì mất ────────────────
    // Chủ nhóm không rời được nhóm của mình nên phải mượn người khác. Đọc ĐÚNG
    // khối tên của người ấy chứ không đếm số lần chuỗi xuất hiện trên trang:
    // đếm thì dính cả những nhóm khác đang có sẵn trên hệ thống.
    const ba = await db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true } });
    check('có người thứ ba để kiểm', !!ba);
    if (ba) {
      await db.clubMember.create({
        data: { clubId: clb.id, userId: ba.id, role: 'MEMBER', status: 'ACTIVE' },
        select: { id: true },
      });
      const cua = async () => {
        await p.goto(`${BASE}/thanh-vien`, { waitUntil: 'networkidle' });
        await p.waitForTimeout(900);
        return p.evaluate(() => {
          const khoi = [...document.querySelectorAll('span.inline-flex')]
            .find((e) => e.textContent?.includes('Lan Phạm'));
          return khoi ? khoi.textContent.trim() : null;
        });
      };
      const co = await cua();
      check('thành viên thường cũng đeo thẻ nhóm', !!co && co.includes(`[${TAT}]`), String(co));

      await db.clubMember.deleteMany({ where: { clubId: clb.id, userId: ba.id } });
      const het = await cua();
      check('rời nhóm thì thẻ mất ngay, không cần bấm gì',
        !!het && !het.includes(`[${TAT}]`), String(het));
    }

    // ── Ở nhiều nhóm thì thẻ là nhóm mình làm chủ ────────────────────────
    const clb2 = await db.club.create({
      data: {
        name: `${DAU} nhom thu hai`, slug: `${DAU}-hai`, shortName: TAT2,
        ownerId: chu.id, privacy: 'PUBLIC', joinMode: 'OPEN',
      },
      select: { id: true },
    });
    await db.clubMember.create({
      data: { clubId: clb2.id, userId: toi.id, role: 'MEMBER', status: 'ACTIVE' },
      select: { id: true },
    });
    const nhieu = await doThe('/thanh-vien');
    check('ở hai nhóm thì chỉ đeo một thẻ',
      !!nhieu && !(nhieu.includes(`[${TAT}]`) && nhieu.includes(`[${TAT2}]`)), String(nhieu));
    check('thẻ ưu tiên nhóm mình làm chủ', !!nhieu && nhieu.includes(`[${TAT}]`), String(nhieu));
  } finally {
    await wipe();
    await db.user.update({ where: { id: toi.id }, data: { points: diemCu }, select: { id: true } });
  }
}
