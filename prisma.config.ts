import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Có tệp cấu hình thì Prisma thôi tự đọc `.env`, nên phải nạp lấy — không thì
// `DATABASE_URL` rỗng và mọi lệnh prisma đều chết ngay ở bước đọc lược đồ.
import 'dotenv/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
});
