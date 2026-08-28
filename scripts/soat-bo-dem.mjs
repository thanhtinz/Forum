/**
 * Đối soát bộ đếm của chuyên mục, chủ đề và game.
 *
 * Từ nay mọi đường đi đều đếm lại qua `src/lib/forum-counters.ts`, nhưng những
 * con số đã lệch từ trước thì không có gì tự kéo về đúng: ẩn chủ đề rồi hiện
 * lại, xoá chủ đề mà quên trừ trả lời… mỗi lần như vậy là hụt vĩnh viễn.
 * Script này đếm lại từ dữ liệu thật và ghi đè.
 *
 * Chạy: node scripts/soat-bo-dem.mjs        (in ra chỗ lệch rồi CHỮA)
 *       node scripts/soat-bo-dem.mjs --xem  (chỉ in ra, không đụng dữ liệu)
 *
 * Quy ước con số — phải khớp `src/lib/forum-counters.ts`:
 *   • Forum.threadCount  = chủ đề PUBLISHED trong mục,
 *   • Forum.replyCount   = trả lời chưa ẩn nằm trong các chủ đề PUBLISHED,
 *   • Thread.replyCount  = trả lời chưa ẩn của chủ đề,
 *   • Game.commentCount  = bình luận chưa ẩn của game.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const chiXem = process.argv.includes('--xem');

let lech = 0;

/** In một dòng lệch và (nếu được phép) chữa lại. */
async function chua(nhan, cu, moi, ghi) {
  if (cu === moi) return;
  lech++;
  console.log(`  ${nhan}: ${cu} → ${moi}`);
  if (!chiXem) await ghi();
}

async function main() {
  console.log(chiXem ? 'Chỉ xem, không sửa gì.\n' : 'Đối soát và chữa bộ đếm.\n');

  // ── Chủ đề ──────────────────────────────────────────────────────────────
  // Gom bằng groupBy chứ không đếm từng chủ đề: diễn đàn vài nghìn chủ đề mà
  // đếm lẻ là vài nghìn lượt truy vấn.
  console.log('Chủ đề:');
  const traLoiTheoChuDe = new Map(
    (await db.reply.groupBy({ by: ['threadId'], where: { hidden: false }, _count: { _all: true } }))
      .map((r) => [r.threadId, r._count._all]),
  );
  const chuDe = await db.thread.findMany({ select: { id: true, title: true, replyCount: true } });
  for (const t of chuDe) {
    await chua(`chủ đề “${t.title.slice(0, 40)}”`, t.replyCount, traLoiTheoChuDe.get(t.id) ?? 0,
      () => db.thread.update({ where: { id: t.id }, data: { replyCount: traLoiTheoChuDe.get(t.id) ?? 0 }, select: { id: true } }));
  }

  // ── Chuyên mục ──────────────────────────────────────────────────────────
  console.log('Chuyên mục:');
  const forums = await db.forum.findMany({ select: { id: true, name: true, threadCount: true, replyCount: true } });
  for (const f of forums) {
    const threadCount = await db.thread.count({ where: { forumId: f.id, status: 'PUBLISHED' } });
    const replyCount = await db.reply.count({
      where: { hidden: false, thread: { forumId: f.id, status: 'PUBLISHED' } },
    });
    await chua(`${f.name} · số chủ đề`, f.threadCount, threadCount,
      () => db.forum.update({ where: { id: f.id }, data: { threadCount }, select: { id: true } }));
    await chua(`${f.name} · số trả lời`, f.replyCount, replyCount,
      () => db.forum.update({ where: { id: f.id }, data: { replyCount }, select: { id: true } }));
  }

  // ── Game ────────────────────────────────────────────────────────────────
  console.log('Game:');
  const binhLuan = new Map(
    (await db.comment.groupBy({ by: ['gameId'], where: { hidden: false }, _count: { _all: true } }))
      .map((r) => [r.gameId, r._count._all]),
  );
  const games = await db.game.findMany({ select: { id: true, title: true, commentCount: true } });
  for (const g of games) {
    await chua(`${g.title}`, g.commentCount, binhLuan.get(g.id) ?? 0,
      () => db.game.update({ where: { id: g.id }, data: { commentCount: binhLuan.get(g.id) ?? 0 }, select: { id: true } }));
  }

  // ── Danh hiệu chép sẵn ──────────────────────────────────────────────────
  // `User.levelTitle` là bản chép của `LevelRule.name`; chép thì có thể lệch,
  // nên đối soát cùng chỗ với các bộ đếm.
  console.log('Danh hiệu:');
  const bac = await db.levelRule.findMany({ select: { level: true, name: true } });
  for (const r of bac) {
    const n = await db.user.count({
      where: { level: r.level, OR: [{ levelTitle: null }, { NOT: { levelTitle: r.name } }] },
    });
    await chua(`cấp ${r.level} “${r.name}”`, `${n} người sai`, '0 người sai',
      () => db.user.updateMany({ where: { level: r.level }, data: { levelTitle: r.name } }));
  }
  const lacBac = await db.user.count({
    where: { levelTitle: { not: null }, level: { notIn: bac.map((r) => r.level) } },
  });
  await chua('người ở cấp không còn bậc', `${lacBac} người còn danh hiệu`, '0 người còn danh hiệu',
    () => db.user.updateMany({
      where: { level: { notIn: bac.map((r) => r.level) } }, data: { levelTitle: null },
    }));

  // ── Hàng kết bạn trùng ──────────────────────────────────────────────────
  // Hai người bấm "kết bạn" đúng cùng lúc từng sinh ra hai hàng ngược chiều;
  // sót một hàng là album mức "bạn bè" vẫn mở cho người đã huỷ kết bạn.
  console.log('Kết bạn:');
  const capTrung = await db.$queryRaw`
    SELECT LEAST("requesterId", "addresseeId") AS a, GREATEST("requesterId", "addresseeId") AS b, COUNT(*)::int AS n
      FROM "Friendship"
     GROUP BY 1, 2
    HAVING COUNT(*) > 1
  `;
  for (const c of capTrung) {
    lech++;
    console.log(`  cặp ${c.a.slice(0, 6)}…/${c.b.slice(0, 6)}… có ${c.n} hàng`);
    if (chiXem) continue;
    // Giữ lại hàng "đã là bạn" nếu có, không thì giữ hàng cũ nhất.
    const rows = await db.friendship.findMany({
      where: { OR: [{ requesterId: c.a, addresseeId: c.b }, { requesterId: c.b, addresseeId: c.a }] },
      orderBy: [{ status: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    await db.friendship.deleteMany({ where: { id: { in: rows.slice(1).map((r) => r.id) } } });
  }

  console.log(lech === 0 ? '\nKhông có chỗ nào lệch.' : `\n${lech} chỗ lệch${chiXem ? ' (chưa sửa)' : ' đã chữa'}.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
