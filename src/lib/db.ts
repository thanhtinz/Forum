import { PrismaClient } from '@prisma/client';

/*
 * Một client duy nhất cho cả tiến trình.
 *
 * Lúc `next dev` nạp lại mã, mô-đun bị dựng lại từ đầu — mỗi lần lại một client
 * mới, mỗi client một bể kết nối, và chỉ vài chục lần sửa tệp là Postgres từ
 * chối vì hết chỗ. Gắn vào `globalThis` thì bản cũ sống sót qua các lần nạp lại.
 */
const kho = globalThis as unknown as { db?: PrismaClient };

export const db = kho.db ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') kho.db = db;
