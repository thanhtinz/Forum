import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Uy tín: chấm "+" / "−" kèm lý do.
 *
 * Chỗ đáng kiểm nhất là luật chống dìm nhau. Nút trên màn hình chỉ là gợi ý —
 * ai cũng gọi thẳng hành động máy chủ được — nên bài kiểm này bấm nút một lần
 * cho đúng đường người thật đi, rồi soi con số trong cơ sở dữ liệu chứ không
 * tin vào chữ hiện trên trang.
 */
export default async function run(check) {
  const voter = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const target = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!voter || !target) { check('có người dùng mẫu', false, 'thiếu minhdev/huytran'); return; }

  await db.karmaVote.deleteMany({ where: { toId: target.id } });
  await db.user.update({ where: { id: target.id }, data: { karma: 0 } });
  await db.notification.deleteMany({ where: { userId: target.id, type: 'KARMA' } });

  // Luật đòi người chấm có ít nhất 5 bài. Dữ liệu mẫu đủ hay không là chuyện
  // của bộ seed, nên ở đây tự bù cho đủ để bài kiểm luôn kiểm đúng thứ nó nói.
  const thread = await db.thread.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true } });
  if (!thread) { check('có chủ đề mẫu', false, 'chưa có chủ đề nào'); return; }
  const posts = await db.reply.count({ where: { authorId: voter.id } })
    + await db.thread.count({ where: { authorId: voter.id } });
  for (let i = posts; i < 5; i++) {
    await db.reply.create({
      data: { threadId: thread.id, authorId: voter.id, content: `Bài đệm cho bài kiểm uy tín ${i}` },
      select: { id: true },
    });
  }

  const url = `${BASE}/u/huytran`;
  const me = await openPage('minhdev');

  try {
    await me.goto(url, { waitUntil: 'networkidle' });
    await me.waitForTimeout(800);
    check('trang cá nhân có ô uy tín', (await me.locator('text=Sổ uy tín').count()) > 0);

    // ── Chấm một nấc cộng ────────────────────────────────────────────────
    await me.locator('button:has-text("Tăng uy tín")').click();
    await me.waitForTimeout(300);
    check('chưa ghi lý do thì nút Chấm bị khoá',
      await me.locator('button:has-text("Chấm")').isDisabled());

    await me.locator('textarea[name="karmaReason"]').fill('Chỉ mình cách chỉnh nhạc chuông');
    await me.locator('button:has-text("Chấm")').click();
    await me.waitForTimeout(2500);

    const after = await db.user.findUnique({ where: { id: target.id }, select: { karma: true } });
    check('uy tín tăng đúng một nấc', after?.karma === 1, `karma = ${after?.karma}`);

    const vote = await db.karmaVote.findFirst({ where: { toId: target.id }, select: { value: true, reason: true } });
    check('lần chấm được ghi vào sổ kèm lý do',
      vote?.value === 1 && vote?.reason === 'Chỉ mình cách chỉnh nhạc chuông', JSON.stringify(vote));
    check('người được chấm nhận thông báo',
      (await db.notification.count({ where: { userId: target.id, type: 'KARMA' } })) === 1);

    // ── Chấm lại ngay: phải bị chặn ──────────────────────────────────────
    await me.goto(url, { waitUntil: 'networkidle' });
    await me.waitForTimeout(800);
    check('chấm xong thì hai nút biến mất, thay bằng lời nhắc đợi',
      (await me.locator('button:has-text("Tăng uy tín")').count()) === 0
      && (await me.locator('text=giờ sau mới chấm tiếp').count()) > 0);
    check('không có lần chấm thứ hai',
      (await db.karmaVote.count({ where: { fromId: voter.id, toId: target.id } })) === 1);

    // ── Sổ uy tín công khai ──────────────────────────────────────────────
    const anon = await openPage(null);
    await anon.goto(`${BASE}/u/huytran/uy-tin`, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(800);
    const sohtml = await anon.content();
    check('khách vãng lai đọc được sổ uy tín',
      sohtml.includes('Chỉ mình cách chỉnh nhạc chuông') && sohtml.includes('lượt khen'));

    // ── Trang của chính mình: không có nút chấm ──────────────────────────
    await me.goto(`${BASE}/u/minhdev`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(800);
    check('không tự chấm uy tín cho mình được',
      (await me.locator('button:has-text("Tăng uy tín")').count()) === 0);
  } finally {
    await db.karmaVote.deleteMany({ where: { toId: target.id } });
    await db.user.update({ where: { id: target.id }, data: { karma: 0 } });
    await db.notification.deleteMany({ where: { userId: target.id, type: 'KARMA' } });
    await db.reply.deleteMany({ where: { authorId: voter.id, content: { startsWith: 'Bài đệm cho bài kiểm uy tín' } } });
  }
}
