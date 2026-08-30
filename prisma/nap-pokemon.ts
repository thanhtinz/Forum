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
interface HangGoc {
  ma: number; ten: string; loai: string;
  cong: number; thu: number; mu: number; giap: number; mau: number;
  cap: number; vang: number; ngoc: number;
}
interface GymGoc {
  so: number; ten: string; cong: number; thu: number; mau: number;
  exp: number; vang: number; cau: number; he: number; chieu: string[];
}

async function main() {
  const duLieu = JSON.parse(
    readFileSync(new URL('./du-lieu/pokemon.json', import.meta.url), 'utf8'),
  ) as { khu: KhuGoc[]; gym: GymGoc[]; hang: HangGoc[] };

  // Xoá sạch rồi nạp lại thay vì chỉ `upsert`: khi một con được chuyển sang
  // khu khác thì bản cũ vẫn nằm lại, và đúng thế thật — ba con huyền thoại đã
  // sót lại ở Rừng Xanh sau lần chuyển đầu tiên. Bảng này là dữ liệu suy ra,
  // không hàng nào trỏ tới nó theo khoá (trận đấu chép giá trị ra chứ không
  // giữ tham chiếu), nên xoá đi nạp lại là an toàn.
  await db.pokeThuHoang.deleteMany({});

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
  // ── Mười bốn Gym ──────────────────────────────────────────────────────
  // Bản gốc để mỗi Gym một bảng riêng đúng một dòng (`monster`, `monster2`…
  // `monster14`). Thưởng ngọc thì bản gốc lưu ở cột `tree`; ở dữ liệu trích
  // ra chỉ Gym 1 có, nên suy theo bậc cho mười ba Gym còn lại — xem chú thích
  // trong `src/lib/pokemon-const.ts`.
  for (const g of duLieu.gym) {
    const chung = {
      ten: `Gym ${g.so}`, he: g.he || 1,
      cong: g.cong, thu: g.thu, mau: g.mau,
      exp: g.exp, vang: g.vang, cau: g.cau, ngoc: 10 + g.so * 5,
      chieu: g.chieu.filter(Boolean),
      tangNguon: 1500 + g.so, tangNac: 1,
    };
    await db.pokeGym.upsert({ where: { so: g.so }, update: chung, create: { so: g.so, ...chung } });
  }

  // ── Bảng hàng trang bị ────────────────────────────────────────────────
  for (const h of duLieu.hang) {
    const { ma, ...phan } = h;
    await db.pokeHang.upsert({ where: { ma }, update: phan, create: { ma, ...phan } });
  }

  console.log(
    `✅ Nạp ${dem} thú hoang trên ${duLieu.khu.length} khu, ${duLieu.gym.length} Gym,`
    + ` ${duLieu.hang.length} món hàng.`,
  );
}

main().then(() => db.$disconnect()).catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
