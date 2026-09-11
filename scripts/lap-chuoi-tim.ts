import { PrismaClient } from '@prisma/client';
import { dungChuoiTim } from '../src/lib/tim-kiem-const';

/*
 * Lấp cột `timKiem` cho mọi game đang có.
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
    await db.game.update({ where: { id: g.id }, data: { timKiem: chuoi }, select: { id: true } });
    doi += 1;
  }

  console.log(`Đã dựng lại chuỗi tìm cho ${doi} game.`);
  await db.$disconnect();
}

chay();
