import { BASE, db, openPage, doiToi } from '../helpers.mjs';

/**
 * Thứ tự những thứ đứng cạnh tên người dùng.
 *
 *   tên → cấp độ ("Lv4") → danh hiệu → huy hiệu NHẬN → huy hiệu MUA
 *
 * Ba thứ dễ hỏng:
 *  • THỨ TỰ. Trước đây mỗi trang tự ghép lấy `UserName` rồi dán huy hiệu cấp
 *    bên cạnh, nên mỗi chỗ một kiểu và có chỗ hiện cấp độ hai lần.
 *  • DANH HIỆU nay là TÊN BẬC theo cấp, được chép sẵn sang `User.levelTitle`.
 *    Chép thì có thể lệch, nên phải kiểm cả đường đổi tên bậc ở trang quản trị.
 *  • Huy hiệu NHẬN và huy hiệu MUA phải hiện CẠNH NHAU, không thay nhau — tự
 *    kiếm được huy chương mà bị món mua che mất thì còn gì là phần thưởng.
 */
const DAU = 'kiemthu-canhten';
const TEN_BAC = 'Bậc kiểm thử';

export default async function run(check) {
  const ai = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, level: true } });
  if (!ai) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const cu = await db.user.findUnique({ where: { id: ai.id }, select: { shopBadgeId: true, levelTitle: true } });
  const bacCu = await db.levelRule.findUnique({ where: { level: ai.level }, select: { name: true } });

  const wipe = async () => {
    await db.shopItem.deleteMany({ where: { slug: { startsWith: DAU } } });
    await db.medal.deleteMany({ where: { slug: { startsWith: DAU } } });
  };
  await wipe();

  try {
    // Đặt tên bậc rồi chép xuống hàng người dùng — đúng thứ `saveLevelRule` làm.
    await db.levelRule.updateMany({ where: { level: ai.level }, data: { name: TEN_BAC } });
    await db.user.updateMany({ where: { level: ai.level }, data: { levelTitle: TEN_BAC } });

    // Huy hiệu MUA ở quầy.
    const icon = await db.shopItem.create({
      data: {
        slug: `${DAU}-icon`, kind: 'BADGE', name: 'Icon kiểm thử',
        value: '/uploads/icon-pro.png', pricePoints: 5,
      },
      select: { id: true },
    });
    await db.shopPurchase.create({ data: { userId: ai.id, itemId: icon.id, pointsPaid: 5 }, select: { id: true } })
      .catch(() => {});
    // Huy hiệu NHẬN được.
    const hc = await db.medal.create({
      data: { slug: `${DAU}-hc`, name: 'Huy chương kiểm thử', icon: '🔥' },
      select: { id: true },
    });
    await db.userMedal.upsert({
      where: { userId_medalId: { userId: ai.id, medalId: hc.id } },
      update: { displayed: true },
      create: { userId: ai.id, medalId: hc.id, displayed: true },
      select: { id: true },
    });
    await db.user.update({ where: { id: ai.id }, data: { shopBadgeId: icon.id }, select: { id: true } });

    const p = await openPage('huytran');

    /** Đọc thứ tự các phần tử con trong khối tên, theo đúng thứ tự hiển thị. */
    const doThuTu = async (url, boc, danhHieu = TEN_BAC) => {
      await p.goto(BASE + url, { waitUntil: 'networkidle' });
      await p.waitForTimeout(1000);
      return p.evaluate(({ sel, dh }) => {
        const khoi = [...document.querySelectorAll(sel)]
          .find((e) => e.textContent?.includes('Minh Dev'));
        if (!khoi) return null;
        return [...khoi.children].map((e) => {
          if (e.tagName === 'IMG') return `mua:${e.getAttribute('src')}`;
          const t = (e.textContent ?? '').trim();
          if (/^Lv\d+$/.test(t)) return 'lv';
          if (t === '🔥') return 'nhan';
          // Nhận danh hiệu theo ĐÚNG chữ của nó: chính cái tên người dùng cũng
          // là một khối chữ, so kiểu "hễ là chữ thì là danh hiệu" là bắt nhầm tên.
          if (t === dh) return 'danh';
          return t ? `chu:${t}` : 'khac';
        });
      }, { sel: boc, dh: danhHieu });
    };

    for (const [ten, url] of [['trang cá nhân', '/u/minhdev'], ['danh bạ', '/thanh-vien'], ['xếp hạng', '/ranking']]) {
      const thuTu = await doThuTu(url, 'span.inline-flex');
      check(`${ten}: đọc được khối tên`, !!thuTu && thuTu.length >= 4, JSON.stringify(thuTu));
      if (!thuTu) continue;

      const iLv = thuTu.indexOf('lv');
      const iDanh = thuTu.indexOf('danh');
      const iNhan = thuTu.indexOf('nhan');
      const iMua = thuTu.findIndex((x) => x.startsWith('mua:'));

      check(`${ten}: có đủ cấp độ, danh hiệu, huy hiệu nhận, huy hiệu mua`,
        iLv >= 0 && iDanh >= 0 && iNhan >= 0 && iMua >= 0, JSON.stringify(thuTu));
      check(`${ten}: đúng thứ tự Lv → danh hiệu → nhận → mua`,
        iLv < iDanh && iDanh < iNhan && iNhan < iMua, JSON.stringify(thuTu));
      check(`${ten}: cấp độ chỉ hiện một lần`,
        thuTu.filter((x) => x === 'lv').length === 1, JSON.stringify(thuTu));
    }

    // ── Không còn khung biểu tượng cấp bậc ──────────────────────────────
    // Trước đây cạnh Lv có thêm một khung chỉ để chứa biểu tượng của bậc. Bỏ
    // rồi thì không nơi nào được dựng lại nó.
    const conKhungRank = await p.evaluate(() => {
      const khoi = [...document.querySelectorAll('span.inline-flex')]
        .find((e) => e.textContent?.includes('Minh Dev'));
      if (!khoi) return null;
      // Khung cấp bậc cũ là một span chỉ chứa đúng một emoji, không có chữ.
      return [...khoi.children].some((e) => {
        const t = (e.textContent ?? '').trim();
        return e.tagName === 'SPAN' && t.length > 0 && t.length <= 2 && !/[a-zA-Z0-9]/.test(t) && t !== '🔥';
      });
    });
    check('không còn khung biểu tượng cấp bậc cạnh tên', conKhungRank === false, String(conKhungRank));

    // ── Đổi tên bậc thì danh hiệu đổi theo ──────────────────────────────
    // Danh hiệu là bản CHÉP của tên bậc, nên đây là chỗ dễ lệch nhất: sửa tên ở
    // trang quản trị mà quên chép lại là mọi người đeo cái tên cũ mãi mãi.
    const quanTri = await openPage('admin@nova.local', 'admin123');
    await quanTri.goto(`${BASE}/admin/levels`, { waitUntil: 'networkidle' });
    await quanTri.waitForTimeout(900);
    const hang = quanTri.locator('div.p-3').filter({ hasText: `Cấp ${ai.level} · ${TEN_BAC}` }).first();
    const coHang = (await hang.count()) > 0;
    check('trang quản trị cấp bậc hiện đúng bậc vừa đặt', coHang);
    if (coHang) {
      await hang.locator('button[title="Sửa"]').first().click();
      await quanTri.waitForTimeout(600);
      await quanTri.fill('form input[name="name"]', `${TEN_BAC} đổi`);
      await quanTri.locator('form button[type="submit"]').first().click();

      /*
       * Chờ theo TRẠNG THÁI chứ không theo đồng hồ.
       *
       * Đổi tên bậc kéo theo một `updateMany` chép tên mới xuống cột
       * `levelTitle` của MỌI người đang ở cấp ấy. Ngủ cứng 2,5 giây thì máy
       * bận một nhịp là đọc phải tên cũ, và bài kiểm báo đỏ oan dù mã đúng —
       * đây chính là mục hỏng lúc chạy cả bộ mà chạy riêng lại xanh.
       */
      const sau = await doiToi(async () => {
        const u = await db.user.findUnique({ where: { id: ai.id }, select: { levelTitle: true } });
        return u?.levelTitle === `${TEN_BAC} đổi` ? u : null;
      });
      check('đổi tên bậc thì danh hiệu chép sẵn đổi theo',
        sau?.levelTitle === `${TEN_BAC} đổi`, `đang là ${sau?.levelTitle}`);

      const lai = await doThuTu('/u/minhdev', 'span.inline-flex', `${TEN_BAC} đổi`);
      check('trang cá nhân hiện danh hiệu mới', !!lai && lai.includes('danh'), JSON.stringify(lai));
    }

    // Gỡ món mua ra thì huy chương tự kiếm vẫn còn.
    await db.user.update({ where: { id: ai.id }, data: { shopBadgeId: null }, select: { id: true } });
    const conNhan = await doThuTu('/u/minhdev', 'span.inline-flex', `${TEN_BAC} đổi`);
    check('gỡ huy hiệu mua thì huy hiệu nhận vẫn còn',
      !!conNhan && conNhan.includes('nhan') && !conNhan.some((x) => x.startsWith('mua:')),
      JSON.stringify(conNhan));
  } finally {
    await wipe();
    await db.user.update({
      where: { id: ai.id },
      data: { shopBadgeId: cu?.shopBadgeId ?? null, levelTitle: cu?.levelTitle ?? null },
      select: { id: true },
    });
    if (bacCu) {
      await db.levelRule.updateMany({ where: { level: ai.level }, data: { name: bacCu.name } });
      await db.user.updateMany({ where: { level: ai.level }, data: { levelTitle: bacCu.name } });
    }
  }
}
