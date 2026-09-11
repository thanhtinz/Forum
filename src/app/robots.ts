import type { MetadataRoute } from 'next';
import { DIA_CHI_GOC } from '@/lib/dia-chi-goc';

/**
 * Chặn máy tìm kiếm ở mấy chỗ KHÔNG có gì để lập chỉ mục.
 *
 * Không phải vì bí mật — mấy lối ấy đều có cổng chặn riêng rồi. Mà vì lập chỉ
 * mục chúng chỉ tổ hại: máy tìm kiếm tiêu quota bò qua hàng trăm trang cá
 * nhân, rồi trả về cho người tìm một trang đăng nhập thay vì trang game họ
 * đang tìm.
 *
 * `/quan-tri` cũng chặn, dù khung của nó đã khai `robots: { index: false }` —
 * hai lớp vì lớp kia chỉ chặn LẬP CHỈ MỤC chứ không chặn BÒ QUA.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/quan-tri',
        '/api/',
        '/toi',
        '/thong-bao',
        '/thu-vien',
        '/cap-nhat',
        '/dang-nhap',
        '/dang-ky',
      ],
    },
    sitemap: `${DIA_CHI_GOC}/sitemap.xml`,
  };
}
