import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Thứ tự những thứ đứng cạnh tên người dùng.
 *
 *   tên → cấp độ ("Lv4") → cấp bậc → danh hiệu → huy hiệu NHẬN → huy hiệu MUA
 *
 * Mục kiểm này soi đúng hai thứ dễ hỏng:
 *  • THỨ TỰ. Trước đây mỗi trang tự ghép lấy `UserName` rồi dán `LevelBadge`
 *    bên cạnh, nên mỗi chỗ một kiểu và có chỗ hiện cấp độ hai lần.
 *  • Huy hiệu NHẬN và huy hiệu MUA phải hiện CẠNH NHAU, không thay nhau — tự
 *    kiếm được huy chương mà bị món mua che mất thì còn gì là phần thưởng.
 */
const DAU = 'kiemthu-canhten';

export default async function run(check) {
  const ai = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, level: true } });
  if (!ai) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const cu = await db.user.findUnique({
    where: { id: ai.id }, select: { shopBadgeId: true, shopTitleId: true },
  });
  const iconCu = await db.levelRule.findUnique({ where: { level: ai.level }, select: { icon: true } });

  const wipe = async () => {
    await db.shopItem.deleteMany({ where: { slug: { startsWith: DAU } } });
    await db.medal.deleteMany({ where: { slug: { startsWith: DAU } } });
  };
  await wipe();

  try {
    // Cấp bậc có biểu tượng riêng do quản trị đặt.
    await db.levelRule.updateMany({ where: { level: ai.level }, data: { icon: '🔰' } });

    // Huy hiệu MUA ở quầy.
    const icon = await db.shopItem.create({
      data: {
        slug: `${DAU}-icon`, kind: 'BADGE', name: 'Icon kiểm thử',
        value: '/uploads/icon-pro.png', pricePoints: 5,
      },
      select: { id: true },
    });
    await db.shopPurchase.create({ data: { userId: ai.id, itemId: icon.id, pricePaid: 5 }, select: { id: true } })
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
    // Danh hiệu MUA ở quầy — dòng chữ, khác hẳn huy hiệu là hình.
    const danh = await db.shopItem.create({
      data: {
        slug: `${DAU}-danh`, kind: 'TITLE', name: 'Danh hiệu kiểm thử',
        value: 'Cao thủ kiểm thử', pricePoints: 5,
      },
      select: { id: true },
    });
    await db.shopPurchase.create({ data: { userId: ai.id, itemId: danh.id, pricePaid: 5 }, select: { id: true } })
      .catch(() => {});
    await db.user.update({
      where: { id: ai.id }, data: { shopBadgeId: icon.id, shopTitleId: danh.id }, select: { id: true },
    });

    const p = await openPage('huytran');

    /** Đọc thứ tự các phần tử con trong khối tên, theo đúng thứ tự hiển thị. */
    const doThuTu = async (url, boc) => {
      await p.goto(BASE + url, { waitUntil: 'networkidle' });
      await p.waitForTimeout(1000);
      return p.evaluate(({ sel, danhHieu }) => {
        const khoi = [...document.querySelectorAll(sel)]
          .find((e) => e.textContent?.includes('Minh Dev'));
        if (!khoi) return null;
        return [...khoi.children].map((e) => {
          if (e.tagName === 'IMG') return `mua:${e.getAttribute('src')}`;
          const t = (e.textContent ?? '').trim();
          // Cấp độ và cấp bậc là HAI khung riêng: khung cấp độ chỉ có "Lv4",
          // khung cấp bậc chỉ có biểu tượng.
          if (/^Lv\d+$/.test(t)) return 'lv';
          if (t === '🔰') return 'cap';
          if (t === '🔥') return 'nhan';
          // Nhận danh hiệu theo ĐÚNG chữ của nó: chính cái tên người dùng cũng
          // là một khối chữ, so kiểu "hễ là chữ thì là danh hiệu" là bắt nhầm tên.
          if (t === danhHieu) return 'danh';
          return t ? `chu:${t}` : 'khac';
        });
      }, { sel: boc, danhHieu: 'Cao thủ kiểm thử' });
    };

    for (const [ten, url] of [['trang cá nhân', '/u/minhdev'], ['danh bạ', '/thanh-vien'], ['xếp hạng', '/ranking']]) {
      const thuTu = await doThuTu(url, 'span.inline-flex');
      check(`${ten}: đọc được khối tên`, !!thuTu && thuTu.length >= 4, JSON.stringify(thuTu));
      if (!thuTu) continue;

      const iLv = thuTu.indexOf('lv');
      const iCap = thuTu.indexOf('cap');
      const iNhan = thuTu.indexOf('nhan');
      const iMua = thuTu.findIndex((x) => x.startsWith('mua:'));

      const iDanh = thuTu.indexOf('danh');
      check(`${ten}: có đủ cấp độ, cấp bậc, danh hiệu, huy hiệu nhận, huy hiệu mua`,
        iLv >= 0 && iCap >= 0 && iDanh >= 0 && iNhan >= 0 && iMua >= 0, JSON.stringify(thuTu));
      check(`${ten}: đúng thứ tự Lv → cấp bậc → danh hiệu → nhận → mua`,
        iLv < iCap && iCap < iDanh && iDanh < iNhan && iNhan < iMua, JSON.stringify(thuTu));
      // Cấp độ chỉ được in MỘT lần: khung cấp bậc chỉ mang biểu tượng, không
      // in lại "Lv4" thêm lần nữa ngay cạnh con số đã có.
      check(`${ten}: cấp độ chỉ hiện một lần`,
        thuTu.filter((x) => x === 'lv').length === 1, JSON.stringify(thuTu));
    }

    // Gỡ món mua ra thì huy chương tự kiếm vẫn còn.
    await db.user.update({ where: { id: ai.id }, data: { shopBadgeId: null }, select: { id: true } });
    const conNhan = await doThuTu('/u/minhdev', 'span.inline-flex');
    check('gỡ huy hiệu mua thì huy hiệu nhận vẫn còn',
      !!conNhan && conNhan.includes('nhan') && !conNhan.some((x) => x.startsWith('mua:')),
      JSON.stringify(conNhan));
  } finally {
    await wipe();
    await db.user.update({
      where: { id: ai.id },
      data: { shopBadgeId: cu?.shopBadgeId ?? null, shopTitleId: cu?.shopTitleId ?? null },
      select: { id: true },
    });
    await db.levelRule.updateMany({ where: { level: ai.level }, data: { icon: iconCu?.icon ?? null } });
  }
}
