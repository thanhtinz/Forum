import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Cấu hình Prisma.
 *
 * Trước đây phần này nằm ở `package.json#prisma`; Prisma 7 bỏ chỗ đó nên
 * chuyển sang tệp riêng. Biến môi trường trong `.env` không còn được Prisma
 * tự nạp khi có tệp này, nên phải nạp tay ngay đầu tệp.
 */
import 'dotenv/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
