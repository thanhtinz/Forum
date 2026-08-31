/**
 * Nạp bảng thú hoang của Đảo Pokémon.
 *
 * Dữ liệu trích thẳng từ bản kết xuất cơ sở dữ liệu của game gốc
 * (`pokemonv_vn.sql`), gộp mười bốn bảng giống hệt nhau (`pokemon2`,
 * `pokemon3`, `nuoc3`, `lanhtho`…) thành một bảng có cột `khu`.
 *
 * Chạy được nhiều lần: khoá theo (khu, số hiệu gốc) rồi `upsert`.
 *
 * BA CHỖ ĐÃ ĐỔI so với bản gốc, ghi rõ ra đây vì đều là đổi SỐ LIỆU:
 *
 * 1. Chỉ số và phần thưởng của mười lăm khu gốc đã được giãn lại thành một
 *    đường tăng đều theo bậc. Bảng gốc sai bậc tới mức gãy hẳn tiến trình:
 *    Lãnh Thổ (bậc 7, mở ở cấp 18) là BẢN SAO NGUYÊN XI bảng Núi Đá (bậc 3,
 *    cấp 6) nên lên tới chiến trường lại gặp thú yếu hơn cả khu bậc 4 và trả
 *    2 vàng; Hang Huyền Thoại có thú 25.000 máu mà trả 7 vàng; Hoang Mạc bậc
 *    4 yếu hơn Núi Đá bậc 3. Phần thưởng của cả bản gốc cũng gần như đứng yên
 *    (exp và vàng quanh 2–28) trong khi sức mạnh thú đi từ 7 tới 32.000.
 *    Sức mạnh nay lấy theo THỨ HẠNG của con thú trong khu, còn dáng của nó —
 *    lì đòn hay đánh mạnh — vẫn giữ nguyên tỉ lệ cũ giữa công/thủ/máu.
 *
 * 2. Năm khu bậc 9–13 hoàn toàn không có trong bản gốc (bản gốc dừng ở bậc 8
 *    là hết đường đi) — xem chú thích ở `KHU` trong `pokemon-const.ts`.
 *
 * 3. Bộ chiêu của 150 con thuộc năm khu mới lấy theo HỆ, gom từ chính 52 bộ
 *    chiêu của mười lăm khu gốc; riêng hệ Đá bản gốc không có con nào nên bộ
 *    chiêu của hệ ấy là viết mới.
 *
 * 4. TÊN của 46 mã ảnh và của cả mười bốn Gym là ĐẶT MỚI, không phải của bản
 *    gốc. Bản gốc đặt "s" cho 39 mã ảnh khác nhau và "sâu xanh" cho 20 mã nữa;
 *    đợt trước đã tách ra cho mỗi mã một tên nhưng tên tách ra là tên máy sinh
 *    ("Nước #47", "Bọ #12"), còn sáu mã thì mang tên viết thường không dấu
 *    ("ran da", "picachu"). Tên mới đặt theo ĐÚNG hình trong
 *    `public/hoai-niem/pokemon/thu/<mã>.gif` — mở từng tệp ra nhìn rồi đặt.
 *    Hai chỗ tên gốc SAI hẳn so với hình: mã 44 ghi "miclotic" mà hình là con
 *    ốc hoá thạch, mã 313 ghi "picachu" mà hình là con ốc xoắn.
 *    Mười bốn Gym bản gốc không có tên nào cả, chỉ đánh số.
 *
 * Bài kiểm `60-can-bang-dao-pokemon` canh đường cong này, nên chỉnh tay số
 * liệu thì chạy lại bài ấy.
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
      ten: g.ten, he: g.he || 1,
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

  // ── Sổ Đồ Giám của người chơi ─────────────────────────────────────────
  // `PokeDoGiam` CHÉP tên loài lúc gặp chứ không trỏ về bảng thú hoang, nên
  // đổi tên ở đây mà không quét sổ thì người đang chơi vẫn thấy tên cũ mãi.
  // Khoá là mã ảnh, đúng thứ định danh một loài.
  const tenTheoNguon = new Map<number, string>();
  for (const khu of duLieu.khu) for (const t of khu.thu) tenTheoNguon.set(t.nguon, t.ten);
  let soSo = 0;
  for (const [nguon, ten] of tenTheoNguon) {
    const r = await db.pokeDoGiam.updateMany({ where: { nguon, NOT: { ten } }, data: { ten } });
    soSo += r.count;
  }

  console.log(
    `✅ Nạp ${dem} thú hoang trên ${duLieu.khu.length} khu, ${duLieu.gym.length} Gym,`
    + ` ${duLieu.hang.length} món hàng. Sửa tên ${soSo} dòng trong sổ Đồ Giám.`,
  );
}

main().then(() => db.$disconnect()).catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
