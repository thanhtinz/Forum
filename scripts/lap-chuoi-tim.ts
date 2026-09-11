import { PrismaClient } from '@prisma/client';
import { dungChuoiTim, dungChuoiTimChuDe } from '../src/lib/tim-kiem-const';

/*
 * Lấp cột `timKiem` cho mọi game và mọi chủ đề diễn đàn đang có.
 *
 * Cần một lượt chạy tay vì cột này mới thêm: game nhập trước đó mang chuỗi
 * rỗng, nên tìm kiểu gì cũng không ra. Chạy lại nhiều lần vô hại — nó tính lại
 * từ dữ liệu gốc chứ không cộng dồn.
 *
 *   npx tsx scripts/lap-chuoi-tim.ts
 */
const db = new PrismaClient();

// Bọc trong một hàm vì tsx dịch tệp này sang CommonJS, mà ở đó `await` ngoài
// cùng không chạy được.
async function chay() {
    const game = await db.game.findMany({
    select: {
      id: true, ten: true, tenViet: true, nhaPhatTrien: true,
      theLoai: { select: { theLoai: { select: { ten: true } } } },
    },
  });

  let doi = 0;
  for (const g of game) {
    const chuoi = dungChuoiTim({
      ten: g.ten, tenViet: g.tenViet, nhaPhatTrien: g.nhaPhatTrien,
      theLoai: g.theLoai.map((t) => t.theLoai.ten),
    });
    /*
     * Ghi bằng SQL thô để KHÔNG chạm vào `suaLuc`.
     *
     * `suaLuc` mang `@updatedAt`, nên một lượt `update` bình thường sẽ đánh
     * dấu cả mười hai game là "vừa sửa xong" — dù chẳng ai sửa gì. Hai chỗ
     * hỏng theo: cột "Sửa lần cuối" trong bảng quản trị hoá ra nói dối, và
     * `lastmod` trong sơ đồ trang bảo máy tìm kiếm rằng cả kho vừa đổi.
     *
     * Đây là việc BẢO TRÌ, không phải một lần sửa nội dung, nên nó phải đi
     * qua mà không để lại dấu vết nào.
     */
    await db.$executeRaw`UPDATE "Game" SET "timKiem" = ${chuoi} WHERE "id" = ${g.id}`;
    doi += 1;
  }

  console.log(`Đã dựng lại chuỗi tìm cho ${doi} game.`);

  // Chủ đề diễn đàn: cùng lẽ, cùng cách ghi thô — `taoLuc` không được xê dịch,
  // vì thứ tự trong danh sách chủ đề dựa vào mốc thời gian.
  const chuDe = await db.chuDe.findMany({ select: { id: true, tieuDe: true, noiDung: true } });
  for (const c of chuDe) {
    const chuoi = dungChuoiTimChuDe({ tieuDe: c.tieuDe, noiDung: c.noiDung });
    await db.$executeRaw`UPDATE "ChuDe" SET "timKiem" = ${chuoi} WHERE "id" = ${c.id}`;
  }
  console.log(`Đã dựng lại chuỗi tìm cho ${chuDe.length} chủ đề.`);

  await db.$disconnect();
}

chay();
