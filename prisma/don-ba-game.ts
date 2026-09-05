/**
 * Dọn dữ liệu còn sót của Đảo Pokémon, Đảo Rồng và Vạn Đạo Tu Tiên đã gỡ.
 *
 * Chạy **trước** `npx prisma db push` trên cơ sở dữ liệu đã có sẵn dữ liệu.
 *
 * Vì sao cần: `db push` tự bỏ được mấy chục bảng của ba game, nhưng nó KHÔNG
 * biết gì về menu do admin tự nhập. `NavLink` trỏ tới `/pokemon`, `/rong`,
 * `/tu-tien` (và mục con của chúng) vẫn nằm nguyên trong bảng, nên menu đầu
 * trang và chân trang còn bày ba mục dẫn thẳng vào trang 404.
 *
 * Script chạy lại nhiều lần không sao, và trên cơ sở dữ liệu mới tinh thì nó
 * không làm gì cả.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/** Đường dẫn gốc của ba game — mọi menu trỏ vào đây đều thành 404. */
const DUONG_DAN = ['/pokemon', '/rong', '/tu-tien'];

async function main() {
  const viec: string[] = [];

  // Xoá cả mục con: một mục menu có thể là `/pokemon/xep-hang`, không chỉ
  // đúng `/pokemon`.
  const n = await db.$executeRawUnsafe(
    `DELETE FROM "NavLink" WHERE ${DUONG_DAN.map(
      (d) => `"url" = '${d}' OR "url" LIKE '${d}/%'`,
    ).join(' OR ')}`,
  );
  if (n > 0) viec.push(`NavLink: xoá ${n} mục menu trỏ vào ba game`);

  console.log(viec.length ? viec.join('\n') : 'Không còn gì để dọn.');
  console.log('Xong. Giờ chạy: npx prisma db push');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
