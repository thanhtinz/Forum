/**
 * Nạp bảng thú hoang của Đảo Pokémon.
 *
 * Dữ liệu trích thẳng từ bản kết xuất cơ sở dữ liệu của game gốc
 * (`pokemonv_vn.sql`), gộp mười bốn bảng giống hệt nhau (`pokemon2`,
 * `pokemon3`, `nuoc3`, `lanhtho`…) thành một bảng có cột `khu`.
 *
 * Chạy được nhiều lần: khoá theo (khu, số hiệu gốc) rồi `upsert`.
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface ThuGoc {
  nguon: number; ten: string; cong: number; thu: number;
  mau: number; exp: number; vang: number; he: number; nac: number;
  chieu: string[];
}
interface KhuGoc { ma: string; ten: string; bac: number; thu: (ThuGoc & { nguon: number })[] }

async function main() {
  const duLieu = JSON.parse(
    readFileSync(new URL('./du-lieu/pokemon.json', import.meta.url), 'utf8'),
  ) as { khu: KhuGoc[] };

  let dem = 0;
  for (const khu of duLieu.khu) {
    for (const [i, t] of khu.thu.entries()) {
      // Số hiệu gốc trùng nhau giữa các khu là chuyện thường trong bản cũ, nên
      // khoá là cặp (khu, số hiệu) — còn trùng trong CÙNG một khu thì lấy thứ
      // tự dòng làm số hiệu để không nuốt mất con nào.
      const goc = khu.thu.filter((x) => x.nguon === t.nguon).length > 1 ? 100000 + i : t.nguon;
      await db.pokeThuHoang.upsert({
        where: { khu_goc: { khu: khu.ma, goc } },
        update: {
          nguon: t.nguon, ten: t.ten, he: t.he || 1, nac: Math.max(1, t.nac || 1),
          cong: t.cong, thu: t.thu, mau: t.mau, exp: t.exp, vang: t.vang,
          chieu: t.chieu.filter(Boolean),
        },
        create: {
          khu: khu.ma, goc,
          nguon: t.nguon, ten: t.ten, he: t.he || 1, nac: Math.max(1, t.nac || 1),
          cong: t.cong, thu: t.thu, mau: t.mau, exp: t.exp, vang: t.vang,
          chieu: t.chieu.filter(Boolean),
        },
      });
      dem++;
    }
  }
  console.log(`✅ Nạp ${dem} thú hoang trên ${duLieu.khu.length} khu.`);
}

main().then(() => db.$disconnect()).catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
