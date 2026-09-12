import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

/*
 * Gộp `cachChoi` và `luuY` vào `gioiThieu` trước khi gỡ hai cột ấy.
 * Chạy lại nhiều lần vô hại: đã gộp rồi thì hai cột kia rỗng, không gộp nữa.
 */
const game = await db.game.findMany({ select: { id: true, ten: true, gioiThieu: true, cachChoi: true, luuY: true } });
let doi = 0;
for (const g of game) {
  const them = [];
  if (g.cachChoi?.trim()) them.push(`## Cách chơi\n\n${g.cachChoi.trim()}`);
  if (g.luuY?.trim()) them.push(`## Cần biết trước khi tải\n\n${g.luuY.trim()}`);
  if (them.length === 0) continue;
  const moi = [g.gioiThieu?.trim(), ...them].filter(Boolean).join('\n\n');
  await db.game.update({ where: { id: g.id }, data: { gioiThieu: moi, cachChoi: null, luuY: null } });
  doi++;
  console.log(' gộp:', g.ten);
}
console.log(`Đã gộp mô tả cho ${doi} game.`);
await db.$disconnect();
