/**
 * Dọn dữ liệu khi danh hiệu thôi được bán và chuyển thành tên bậc theo cấp.
 *
 * Chạy HAI lần, kẹp `prisma db push` vào giữa — vì hai việc phải làm nằm ở hai
 * phía của lần đổi lược đồ:
 *
 *   node scripts/go-danh-hieu-ban.mjs   ← lượt 1: gỡ món TITLE khỏi cơ sở dữ
 *                                          liệu (Postgres từ chối xoá một giá
 *                                          trị enum khi còn hàng dùng nó)
 *   npx prisma db push && npx prisma generate
 *   node scripts/go-danh-hieu-ban.mjs   ← lượt 2: hoàn điểm và chép danh hiệu
 *                                          (cần cột `levelTitle` và lý do
 *                                          `SHOP_REFUND` vừa thêm)
 *
 * Script tự nhận ra đang ở lượt nào, và chạy lại lần nữa cũng không sao.
 *
 * Nguyên tắc: KHÔNG ai mất điểm. Danh sách phải hoàn được ghi ra tệp ở lượt 1,
 * đọc lại ở lượt 2 — vì lúc ấy hàng mua đã bị xoá rồi.
 */
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const SO_HOAN = new URL('./.danh-hieu-can-hoan.json', import.meta.url).pathname;

/** Cột đã có trong cơ sở dữ liệu chưa. */
async function coCot(bang, cot) {
  const r = await db.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    bang, cot,
  );
  return r.length > 0;
}

/** Giá trị enum còn tồn tại không. */
async function coEnum(ten, gia) {
  const r = await db.$queryRawUnsafe(
    `SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = $1 AND e.enumlabel = $2`,
    ten, gia,
  );
  return r.length > 0;
}

/** Lượt 1 — gỡ mọi dấu vết của loại món TITLE khỏi dữ liệu. */
async function luot1() {
  const mon = await db.$queryRawUnsafe(
    `SELECT "id", "name" FROM "ShopItem" WHERE "kind"::text = 'TITLE'`,
  );
  console.log(`Món danh hiệu đang bán: ${mon.length}`);

  const luot = mon.length === 0 ? [] : await db.$queryRawUnsafe(
    `SELECT p."userId", p."itemId", p."pointsPaid", i."name" AS "tenMon", u."username"
       FROM "ShopPurchase" p
       JOIN "ShopItem" i ON i."id" = p."itemId"
       JOIN "User" u ON u."id" = p."userId"
      WHERE i."kind"::text = 'TITLE' AND p."pointsPaid" > 0`,
  );
  fs.writeFileSync(SO_HOAN, JSON.stringify(luot, null, 2));
  console.log(`Ghi danh sách phải hoàn: ${luot.length} lượt → ${SO_HOAN}`);

  const deo = await db.$executeRawUnsafe(
    `UPDATE "User" SET "shopTitleId" = NULL WHERE "shopTitleId" IS NOT NULL`,
  );
  console.log(`Gỡ khỏi hồ sơ: ${deo} người`);

  if (mon.length > 0) {
    await db.$executeRawUnsafe(
      `DELETE FROM "ShopPurchase" p USING "ShopItem" i
        WHERE i."id" = p."itemId" AND i."kind"::text = 'TITLE'`,
    );
    await db.$executeRawUnsafe(`DELETE FROM "ShopItem" WHERE "kind"::text = 'TITLE'`);
    console.log(`Đã xoá ${mon.length} món danh hiệu`);
  }
  console.log('\nGiờ chạy: npx prisma db push && npx prisma generate, rồi chạy lại script này.');
}

/** Lượt 2 — hoàn điểm và chép tên bậc thành danh hiệu. */
async function luot2() {
  // ── Hoàn điểm ───────────────────────────────────────────────────────────
  const can = fs.existsSync(SO_HOAN) ? JSON.parse(fs.readFileSync(SO_HOAN, 'utf8')) : [];
  console.log(`Lượt mua phải hoàn: ${can.length}`);
  for (const m of can) {
    // Chạy lại lần nữa cũng không hoàn hai lần: sổ điểm đã ghi thì thôi.
    const daHoan = await db.pointsLog.findFirst({
      where: { userId: m.userId, reason: 'SHOP_REFUND', refId: m.itemId },
      select: { id: true },
    });
    if (daHoan) { console.log(`  @${m.username}: đã hoàn từ trước, bỏ qua`); continue; }

    const u = await db.user.update({
      where: { id: m.userId },
      data: { points: { increment: m.pointsPaid } },
      select: { points: true },
    });
    await db.pointsLog.create({
      data: {
        userId: m.userId, amount: m.pointsPaid, balance: u.points,
        reason: 'SHOP_REFUND', refId: m.itemId,
        note: `Hoàn điểm: danh hiệu “${m.tenMon}” thôi bán`,
      },
    });
    console.log(`  hoàn ${m.pointsPaid} điểm cho @${m.username}`);
  }
  if (can.length > 0) fs.rmSync(SO_HOAN, { force: true });

  // ── Chép tên bậc thành danh hiệu ────────────────────────────────────────
  const rules = await db.levelRule.findMany({ select: { level: true, name: true } });
  let chep = 0;
  for (const r of rules) {
    // `NOT: { levelTitle: r.name }` một mình là bẫy: trong SQL, `NULL != 'x'`
    // ra NULL chứ không ra true, nên những hàng chưa có danh hiệu — đúng những
    // hàng cần chép nhất — lại bị bỏ qua sạch.
    const n = await db.user.updateMany({
      where: {
        level: r.level,
        OR: [{ levelTitle: null }, { NOT: { levelTitle: r.name } }],
      },
      data: { levelTitle: r.name },
    });
    if (n.count > 0) console.log(`  cấp ${r.level} → “${r.name}”: ${n.count} người`);
    chep += n.count;
  }
  // Ai đang ở cấp không còn bậc nào thì không có danh hiệu để đeo.
  const lac = await db.user.updateMany({
    where: { levelTitle: { not: null }, level: { notIn: rules.map((r) => r.level) } },
    data: { levelTitle: null },
  });
  console.log(`Chép danh hiệu: ${chep} người${lac.count > 0 ? `, gỡ ${lac.count} người ở cấp không còn bậc` : ''}`);
}

async function main() {
  const conTitle = await coEnum('ShopItemKind', 'TITLE');
  const coLevelTitle = await coCot('User', 'levelTitle');

  if (conTitle) await luot1();
  else if (coLevelTitle) await luot2();
  else console.log('Lược đồ đang ở giữa chừng: chạy `npx prisma db push` rồi chạy lại.');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
