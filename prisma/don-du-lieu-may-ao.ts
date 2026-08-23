/**
 * Dọn dữ liệu còn sót của tính năng máy ảo (Play Online) đã bỏ.
 *
 * Chạy **trước** `npx prisma db push` trên cơ sở dữ liệu đã có sẵn dữ liệu.
 *
 * Vì sao cần: schema mới bỏ ba giá trị `PLAY_START` / `PLAY_END` / `PLAY_ERROR`
 * khỏi enum `GameEventType`. Postgres không cho bỏ giá trị enum khi còn hàng
 * dùng tới, nên `db push` **dừng ngay ở bước đó** — và mọi thay đổi phía sau
 * (trong đó có cột `GameVersion.platform` của tính năng tải theo nền tảng)
 * không bao giờ được áp. Kết quả là trang /games, /games/browse, trang chi
 * tiết và tìm kiếm đều trả 500 với `The column GameVersion.platform does not
 * exist in the current database`.
 *
 * Script chạy lại nhiều lần không sao, và trên cơ sở dữ liệu mới tinh thì nó
 * không làm gì cả.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/** Bảng và kiểu của máy ảo — schema mới không còn khai báo chúng nữa. */
const BANG_MAY_AO = [
  'SaveState',
  'UserKeymap',
  'UserGameConfig',
  'EmulatorSession',
  'GameEmulatorProfile',
  'EmulatorProfile',
];
const KIEU_MAY_AO = ['Orientation', 'EmuSupport', 'SessionStatus', 'SaveKind'];
/** Cột thống kê chơi online, sinh ra từ máy ảo nên đi theo. */
const COT_MAY_AO: [string, string[]][] = [
  ['Game', ['emulatorProfileId', 'playCount', 'playOnline', 'uniquePlayerCount', 'playSeconds']],
  ['GameVersion', ['playOnline']],
  ['GameEvent', ['sessionId']],
];

async function main() {
  const viec: string[] = [];

  // 1. Hàng sự kiện PLAY_* — phải xoá trước khi bỏ giá trị enum.
  const coEnumCu = await db.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*)::bigint AS n FROM pg_enum
     WHERE enumtypid = to_regtype('"GameEventType"')
       AND enumlabel IN ('PLAY_START', 'PLAY_END', 'PLAY_ERROR')`,
  );
  if (Number(coEnumCu[0]?.n ?? 0) > 0) {
    for (const bang of ['GameEvent', 'GameUniqueHit']) {
      const n = await db.$executeRawUnsafe(
        `DELETE FROM "${bang}" WHERE type::text IN ('PLAY_START', 'PLAY_END', 'PLAY_ERROR')`,
      );
      if (n > 0) viec.push(`${bang}: xoá ${n} hàng PLAY_*`);
    }
  }

  // 2. Cột thống kê chơi online.
  for (const [bang, cot] of COT_MAY_AO) {
    for (const c of cot) {
      await db.$executeRawUnsafe(`ALTER TABLE IF EXISTS "${bang}" DROP COLUMN IF EXISTS "${c}"`);
    }
  }

  // 3. Bảng và kiểu của máy ảo.
  await db.$executeRawUnsafe(
    `DROP TABLE IF EXISTS ${BANG_MAY_AO.map((b) => `"${b}"`).join(', ')} CASCADE`,
  );
  for (const k of KIEU_MAY_AO) {
    await db.$executeRawUnsafe(`DROP TYPE IF EXISTS "${k}" CASCADE`);
  }

  console.log(viec.length ? viec.join('\n') : 'Không còn gì để dọn.');
  console.log('Xong. Giờ chạy: npx prisma db push');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
