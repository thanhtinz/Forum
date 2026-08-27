/**
 * Dọn dữ liệu cũ trước khi bỏ hẳn cửa hàng, VIP và tiền nạp.
 *
 * Phải chạy TRƯỚC `prisma db push`: các cột và giá trị enum sắp bị xoá vẫn
 * đang có dữ liệu thật, Postgres sẽ từ chối xoá giá trị enum còn hàng dùng nó.
 *
 * Nguyên tắc: KHÔNG xoá nội dung của ai. Bài từng bán bằng tiền hoặc khoá theo
 * VIP được chuyển sang lưu trữ để chủ trang tự xem lại và quyết định — để
 * nguyên thành FREE thì phần nội dung ẩn từng thu tiền bỗng dưng ai cũng đọc.
 *
 * Chạy: node scripts/go-bo-tien-va-vip.mjs
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const sql = (strings, ...values) => db.$executeRawUnsafe(String.raw({ raw: strings }, ...values));

async function main() {
  // 1. Bài trả tiền / chỉ VIP → lưu trữ, mức truy cập về FREE.
  //    Lưu trữ nên không hiện ở đâu công khai; nội dung ẩn vẫn còn trong CSDL.
  const archived = await db.$executeRawUnsafe(`
    UPDATE "Post"
       SET "status" = 'ARCHIVED', "access" = 'FREE'
     WHERE "access"::text IN ('PAID', 'VIP_ONLY')
  `);
  console.log(`Đã chuyển ${archived} bài trả tiền / chỉ-VIP sang lưu trữ.`);

  // 2. Khu vực diễn đàn giới hạn theo VIP → giới hạn theo thành viên.
  const forums = await db.$executeRawUnsafe(`
    UPDATE "Forum" SET "postAccess" = 'MEMBERS' WHERE "postAccess"::text = 'VIP'
  `);
  console.log(`Đã đổi ${forums} khu vực từ "chỉ VIP" sang "chỉ thành viên".`);

  // 3. Đơn hàng không phải mua nội dung (nạp tiền, mua VIP, mua điểm) không còn
  //    ý nghĩa gì — xoá. Đơn mua nội dung giữ nguyên vì đó là sổ ghi quyền
  //    sở hữu: xoá đi là người đã mua mất quyền xem.
  const orders = await db.$executeRawUnsafe(`
    DELETE FROM "Order" WHERE "type"::text <> 'CONTENT'
  `);
  console.log(`Đã xoá ${orders} đơn nạp tiền / mua VIP / mua điểm.`);

  // 4. Mã giảm giá gắn với loại đơn đã bỏ thì không dùng được nữa — tắt đi
  //    chứ không xoá, để lịch sử ai đã nhận mã còn nguyên.
  const coupons = await db.$executeRawUnsafe(`
    UPDATE "Coupon" SET "active" = false
     WHERE "appliesTo" IS NOT NULL AND "appliesTo"::text <> 'CONTENT'
  `);
  console.log(`Đã tắt ${coupons} mã giảm giá dành cho nạp tiền / VIP.`);

  console.log('\nXong. Giờ chạy được: npx prisma db push');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
