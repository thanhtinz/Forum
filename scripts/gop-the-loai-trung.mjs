import { PrismaClient } from '@prisma/client';

/*
 * GỘP MẤY THỂ LOẠI TRÙNG TÊN.
 *
 * VÌ SAO CÓ TỆP NÀY: một bản `thanhDuongDan` cũ ăn mất chữ "Đ" đầu từ, nên
 * "Đua xe" đẻ ra đường dẫn "ua-xe" nằm cạnh "dua-xe" — hai thể loại khác
 * đường dẫn mà cùng một cái tên. Trên trang game nó hiện ra hai cái chip y hệt
 * nhau, mà tai hại hơn là người bày hàng gắn nhãn vào cái nào cũng được, nên
 * game cùng một loại tách làm hai danh sách rời nhau.
 *
 * Chỗ lưu thể loại nay đã chặn trùng tên, nên tệp này chỉ dọn phần đã lỡ. Vẫn
 * giữ lại trong kho mã thay vì gõ tay một lần rồi thôi: nó ghi lại đã gộp cái
 * gì vào cái gì, và nếu còn sót cặp nào thì chạy lại là xong.
 *
 * GIỮ CÁI NÀO: bản có đường dẫn khớp với tên đã chuẩn hoá — đó là cái đúng.
 * Không có cái nào khớp thì giữ cái ra đời trước, vì đường dẫn của nó đã nằm
 * trong đường đi người ta lưu lại và máy tìm kiếm đã đánh chỉ mục.
 *
 * Chạy: node scripts/gop-the-loai-trung.mjs
 */

const db = new PrismaClient();

/** Chép y nguyên `thanhDuongDan` — tệp này chạy ngoài Next nên không mượn được alias `@/`. */
function thanhDuongDan(chu) {
  return chu
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const tatCa = await db.theLoai.findMany({
  select: { id: true, ten: true, duongDan: true, taoLuc: true },
  orderBy: { id: 'asc' },
});

const nhom = new Map();
for (const t of tatCa) {
  const khoa = t.ten.trim().toLowerCase();
  if (!nhom.has(khoa)) nhom.set(khoa, []);
  nhom.get(khoa).push(t);
}

let daGop = 0;
for (const [, cung] of nhom) {
  if (cung.length < 2) continue;

  const chuan = thanhDuongDan(cung[0].ten);
  const giu = cung.find((t) => t.duongDan === chuan) ?? cung[0];
  const bo = cung.filter((t) => t.id !== giu.id);

  console.log(`Gộp "${giu.ten}": giữ /${giu.duongDan}, bỏ ${bo.map((t) => `/${t.duongDan}`).join(', ')}`);

  for (const t of bo) {
    const gan = await db.theLoaiTrenGame.findMany({
      where: { theLoaiId: t.id }, select: { gameId: true },
    });

    /*
     * `skipDuplicates` chứ không phải chèn thẳng: game nào đã mang CẢ HAI nhãn
     * thì hàng mới trùng khoá chính ghép, chèn thẳng là ném lỗi giữa chừng và
     * bỏ dở việc gộp. Đây chính là tình cảnh của game đang có sẵn.
     */
    if (gan.length > 0) {
      await db.theLoaiTrenGame.createMany({
        data: gan.map((g) => ({ gameId: g.gameId, theLoaiId: giu.id })),
        skipDuplicates: true,
      });
    }

    // Xoá thể loại kéo theo hàng gán của nó (onDelete: Cascade), nên không cần
    // dọn `theLoaiTrenGame` bằng tay.
    await db.theLoai.delete({ where: { id: t.id } });
    console.log(`  chuyển ${gan.length} game khỏi /${t.duongDan} rồi xoá`);
    daGop++;
  }
}

console.log(daGop === 0 ? 'Không có thể loại nào trùng tên.' : `Xong: bỏ ${daGop} thể loại thừa.`);
await db.$disconnect();
