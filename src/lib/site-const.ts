/**
 * Hằng số và phép tính thuần của cài đặt trang — KHÔNG đụng cơ sở dữ liệu.
 *
 * Tách khỏi `site.ts` để `revenue-share.ts` lấy được mức hoa hồng mặc định mà
 * không kéo theo Prisma, và để bài kiểm `.mjs` nạp thẳng được tệp này.
 */

import { PLATFORM_COMMISSION_PERCENT } from './revenue-share';

/** URL gốc của trang, dùng cho SEO (sitemap, robots, Open Graph). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const SITE_NAME = 'Nova Platform';
export const SITE_DESCRIPTION = 'Diễn đàn và kho game, tính điểm thay cho tiền.';

export const SITE_SETTING_KEY = 'site_general';

export interface SiteSettings {
  name: string;
  /** Chữ nhỏ cạnh tên, để trống thì không hiện. */
  tagline: string;
  /** Ảnh logo; để trống thì hiện chữ cái đầu của tên. */
  logo: string;
  /** Mô tả dùng cho thẻ SEO của trang chủ. */
  description: string;
  /** Dòng bản quyền ở chân trang. */
  footerText: string;
  /**
   * Phần nền tảng giữ lại khi có người mở khối `[hide=diem:N]` (%).
   * Tác giả nhận phần còn lại. Trước đây là hằng số cứng 30 trong mã.
   */
  hoaHongPhanTram: number;
}

export const SITE_DEFAULTS: SiteSettings = {
  name: 'Nova',
  tagline: '',
  logo: '',
  description: SITE_DESCRIPTION,
  footerText: `${SITE_NAME}. Diễn đàn và kho game.`,
  hoaHongPhanTram: PLATFORM_COMMISSION_PERCENT,
};
