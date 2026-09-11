import { PrismaClient } from '@prisma/client';

/*
 * Một client duy nhất cho cả tiến trình.
 *
 * Lúc `next dev` nạp lại mã, mô-đun bị dựng lại từ đầu — mỗi lần lại một client
 * mới, mỗi client một bể kết nối, và chỉ vài chục lần sửa tệp là Postgres từ
 * chối vì hết chỗ. Gắn vào `globalThis` thì bản cũ sống sót qua các lần nạp lại.
 */
const kho = globalThis as unknown as { db?: PrismaClient };

/*
 * Bật `DEM_TRUY_VAN=1` thì mỗi câu truy vấn in ra một dòng.
 *
 * Dùng để đi tìm chỗ gọi CSDL trong vòng lặp — thứ không nhìn ra được bằng đọc
 * mã, vì nó nằm rải ở mấy thành phần lồng nhau. Mặc định TẮT: ở bản thật, in
 * mọi câu truy vấn vừa làm chậm vừa đổ cả tham số vào nhật ký.
 */
export const db = kho.db ?? new PrismaClient(
  process.env.DEM_TRUY_VAN === '1' ? { log: ['query'] } : undefined,
);

if (process.env.NODE_ENV !== 'production') kho.db = db;
