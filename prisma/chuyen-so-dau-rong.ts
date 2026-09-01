/**
 * Chuyển sổ đếm trận đấu trường rồng từ `MiniGamePlay` sang `RongLuotDau`.
 *
 * Chạy MỘT LẦN trên máy chủ thật, TRƯỚC khi `prisma db push` bỏ bảng cũ:
 *
 *   npx tsx prisma/chuyen-so-dau-rong.ts
 *
 * Không chép thì trần "mỗi ngày mười trận" mất trí nhớ đúng vào ngày đổi bảng,
 * và ai đã đấu đủ hôm ấy được đấu lại từ đầu. Chỉ lệch một ngày, nhưng đây là
 * cái trần chặn một vòng lặp có lãi nên không đáng để lệch.
 *
 * Viết bằng SQL trần chứ không qua Prisma Client: lược đồ đã bỏ model
 * `MiniGamePlay` rồi, nên client không còn biết bảng ấy nữa — mà bảng thì vẫn
 * nằm đó cho tới lượt `db push` kế tiếp.
 *
 * Chạy lại nhiều lần cũng không sao: bảng cũ không còn thì thôi, mà bảng mới
 * đã có hàng thì cũng thôi — không chép chồng.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const [{ co }] = await db.$queryRaw<{ co: boolean }[]>`
    SELECT to_regclass('public."MiniGamePlay"') IS NOT NULL AS co
  `;
  if (!co) {
    console.log('Không còn bảng MiniGamePlay — chắc đã chuyển xong từ trước.');
    return;
  }

  const daCo = await db.rongLuotDau.count();
  if (daCo > 0) {
    console.log(`Bảng mới đã có ${daCo} hàng — thôi không chép nữa.`);
    return;
  }

  const chep = await db.$executeRaw`
    INSERT INTO "RongLuotDau" ("id", "userId", "doi", "ketQua", "createdAt")
    SELECT "id", "userId", "delta", COALESCE("detail", 'thua'), "createdAt"
    FROM "MiniGamePlay"
    WHERE "game" = 'RONGDAU'
  `;
  console.log(`Đã chép ${chep} lượt đấu rồng sang RongLuotDau.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
