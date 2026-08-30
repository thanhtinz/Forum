import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Năm trò dựng lại từ bộ mod JohnCMS `game-by-wapit`.
 *
 * Chỗ hỏng là mất thật ở đây KHÔNG phải giao diện mà là tiền:
 *  • Mỗi lượt phải ghi đúng một hàng `MiniGamePlay` và đổi điểm đúng bằng
 *    `delta` — lệch một chỗ là điểm tự sinh ra từ hư không.
 *  • Trần ván mỗi ngày phải chặn thật, vì đây là mấy trang bấm-là-ra-điểm.
 *  • Cược ngoài khoảng cho phép phải bị máy chủ chặn, không tin ô `min/max`
 *    của trình duyệt — người ta gọi thẳng server action là qua hết.
 *
 * KHÔNG kiểm "chơi N ván thì lãi/lỗ bao nhiêu": mỗi ván là một lần tung đồng
 * xu, muốn đo kỳ vọng cho ra số tin được thì phải chạy hàng vạn ván. Phần tỉ
 * lệ đã tính tay và ghi rõ trong `mini-game-const.ts`.
 */
const TRO = [
  { slug: 'quay-xeng', game: 'QUAYXENG', ten: 'Máy quay xèng', nut: 'Quay!', dien: 'Đang quay…', chon: null },
  { slug: 'phi-tieu', game: 'PHITIEU', ten: 'Phi tiêu', nut: 'Ném phi tiêu!', dien: 'Đang ngắm…', chon: null },
  { slug: 'soc-dia', game: 'SOCDIA', ten: 'Sóc đĩa', nut: 'Mở bát!', dien: 'Đang xóc…', chon: 'input[name="cua"][value="1"]' },
  { slug: 'dap-trung', game: 'DAPTRUNG', ten: 'Đập trứng', nut: 'Đập!', dien: 'Đang đập…', chon: 'input[name="trung"][value="2"]' },
  { slug: 'sut-phat', game: 'SUTPHAT', ten: 'Sút phạt', nut: 'Sút!', dien: 'Đang chạy đà…', chon: 'input[name="goc"][value="3"]' },
];

/**
 * Câu kể kết quả, KHÔNG phải nhãn "Cược (điểm)".
 *
 * Lần đầu tôi soi bằng `/điểm/` — mà chữ ấy có sẵn trong nhãn ô cược nên bài
 * kiểm báo "đã lộ kết quả" ngay từ lúc chưa bấm gì.
 *
 * Nhánh "không mất điểm nào" là ván HOÀ của phi tiêu: hoà thì câu kể không có
 * con số nào, thiếu nhánh này là cứ hoà một cái là đỏ oan.
 */
const KE_KET_QUA = /(được|mất|Mất|Được|\+)\s*\d+\s*điểm|không mất điểm nào/;

/** Đợi hoạt cảnh diễn xong, nhận ra bằng lúc nút chơi bật lại. */
async function doiDienXong(p, nut) {
  await p.locator(`button:has-text("${nut}")`).waitFor({ state: 'visible', timeout: 15_000 });
  await p.waitForFunction(
    (chu) => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes(chu));
      return !!b && !b.disabled;
    },
    nut, { timeout: 15_000 },
  );
}

export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!me) { check('có dữ liệu mẫu', false, 'thiếu minhdev'); return; }

  await db.miniGamePlay.deleteMany({ where: { userId: me.id, game: { in: TRO.map((t) => t.game) } } });
  // Đủ điểm để chơi thoải mái mà không đụng vào chuyện thiếu điểm.
  await db.user.update({ where: { id: me.id }, data: { points: 5000 } });

  const p = await openPage('minhdev');
  const khach = await openPage(null);

  // ── Khu giải trí có lối vào cả năm trò ───────────────────────────────
  await p.goto(`${BASE}/giai-tri`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  for (const t of TRO) {
    check(`khu giải trí có ô ${t.ten}`,
      (await p.locator(`a[href="/giai-tri/${t.slug}"]`).count()) > 0);
  }

  for (const t of TRO) {
    const url = `${BASE}/giai-tri/${t.slug}`;

    // ── Khách vãng lai chỉ được xem, không được chơi ───────────────────
    await khach.goto(url, { waitUntil: 'networkidle' });
    await khach.waitForTimeout(500);
    check(`${t.ten}: khách thấy trang nhưng không có nút chơi`,
      (await khach.locator(`button:has-text("${t.nut}")`).count()) === 0);

    // ── Chơi một ván thật ──────────────────────────────────────────────
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const truoc = (await db.user.findUnique({ where: { id: me.id }, select: { points: true } })).points;

    if (t.chon) await p.locator(t.chon).check({ force: true });
    await p.fill('input[name="cuoc"]', '20');
    await p.locator(`button:has-text("${t.nut}")`).click();

    // Ngay sau khi bấm phải vào màn "diễn ra": nút đổi chữ và bị khoá. Không
    // có nó thì kết quả nhảy ra tức thì, chẳng ai kịp thấy bát xóc hay bóng bay.
    const nutDien = p.locator(`button:has-text("${t.dien}")`);
    // Đợi chữ đổi chứ không đếm ngay: bấm xong React còn phải vẽ lại một lượt.
    const vaoMan = await nutDien.waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true).catch(() => false);
    check(`${t.ten}: bấm xong thì vào màn đang diễn`, vaoMan);
    check(`${t.ten}: đang diễn thì không bấm thêm được`,
      vaoMan && await nutDien.isDisabled().catch(() => false));
    // Kết quả phải CÒN GIẤU trong lúc diễn — lộ sớm là hoạt cảnh thành thừa.
    check(`${t.ten}: đang diễn thì chưa lộ kết quả`,
      !KE_KET_QUA.test(await p.locator('form:has(input[name="cuoc"])').innerText()));

    await doiToi(async () => (await db.miniGamePlay.count({ where: { userId: me.id, game: t.game } })) > 0);
    await doiDienXong(p, t.nut);

    const van = await db.miniGamePlay.findFirst({
      where: { userId: me.id, game: t.game },
      select: { bet: true, delta: true, detail: true },
    });
    check(`${t.ten}: ghi lại đúng một ván`, !!van, 'không thấy hàng nào');
    check(`${t.ten}: ghi đúng số điểm đã cược`, van?.bet === 20, `đang là ${van?.bet}`);
    check(`${t.ten}: có ghi lại diễn biến ván`, !!van?.detail, String(van?.detail));

    const sau = (await db.user.findUnique({ where: { id: me.id }, select: { points: true } })).points;
    check(`${t.ten}: điểm đổi đúng bằng delta của ván`,
      sau === truoc + (van?.delta ?? NaN), `${truoc} → ${sau}, delta ${van?.delta}`);

    check(`${t.ten}: diễn xong thì kể lại kết quả ván`,
      KE_KET_QUA.test(await p.locator('form:has(input[name="cuoc"])').innerText()));

    // ── Cược ngoài khoảng bị máy chủ chặn ──────────────────────────────
    const soVanTruoc = await db.miniGamePlay.count({ where: { userId: me.id, game: t.game } });
    if (t.chon) await p.locator(t.chon).check({ force: true });
    // Gỡ trần của trình duyệt rồi mới gõ: cần thử LUẬT CỦA MÁY CHỦ, chứ ô
    // `max` chặn ngay tại chỗ thì chẳng kiểm được gì.
    await p.locator('input[name="cuoc"]').evaluate((el) => { el.removeAttribute('max'); });
    await p.fill('input[name="cuoc"]', '99999');
    await p.locator(`button:has-text("${t.nut}")`).click();
    await p.waitForTimeout(2500);
    check(`${t.ten}: cược quá trần thì không ghi thêm ván nào`,
      (await db.miniGamePlay.count({ where: { userId: me.id, game: t.game } })) === soVanTruoc);
  }

  // ── Trần ván mỗi ngày ────────────────────────────────────────────────
  // Nhồi thẳng vào bảng cho đủ trần rồi mới thử bấm: chơi tay 30 ván trong bộ
  // kiểm thì lượt nào cũng mất nửa phút mà chẳng soi thêm được gì.
  // Trần lấy từ CHÍNH TRANG chứ không chép lại con số: Node không nạp được
  // tệp `.ts` của dự án, mà gõ tay 30 vào đây là mai đổi hằng số thì bài này
  // âm thầm kiểm sai.
  await p.goto(`${BASE}/giai-tri/soc-dia`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const conText = await p.locator('text=/Còn \\d+ ván hôm nay/').first().innerText();
  const con = Number(conText.match(/\d+/)[0]);
  check('đọc được số ván còn lại trên trang', con > 0, conText);

  await db.miniGamePlay.createMany({
    data: Array.from({ length: con }, () => ({
      userId: me.id, game: 'SOCDIA', bet: 10, delta: -10, detail: 'nhồi cho đủ trần',
    })),
  });

  await p.goto(`${BASE}/giai-tri/soc-dia`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  check('hết lượt thì trang báo còn 0 ván',
    (await p.locator('text=Còn 0 ván hôm nay').count()) > 0);
  const nutTat = await p.locator('button:has-text("Mở bát!")').isDisabled();
  check('hết lượt thì nút chơi bị tắt', nutTat);

  const truocTran = await db.miniGamePlay.count({ where: { userId: me.id, game: 'SOCDIA' } });
  await p.locator('button:has-text("Mở bát!")').click({ force: true }).catch(() => {});
  await p.waitForTimeout(1200);
  check('hết lượt thì máy chủ cũng không nhận thêm ván',
    (await db.miniGamePlay.count({ where: { userId: me.id, game: 'SOCDIA' } })) === truocTran);

  await db.miniGamePlay.deleteMany({ where: { userId: me.id, game: { in: TRO.map((t) => t.game) } } });
}
