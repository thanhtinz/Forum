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
        /*
         * Mấy lối còn lại của phần tài khoản. Cùng một lẽ với `/toi`: chúng
         * hoặc là trang RIÊNG của một người, hoặc là một cánh cửa chỉ có nghĩa
         * khi đang cầm sẵn một mã trong tay. Để máy tìm kiếm lập chỉ mục thì
         * kết quả tìm "SunnyStore" lẫn vào mấy trang trống rỗng ấy, mà người
         * bấm vào chỉ gặp một biểu mẫu không dùng được.
         */
        '/da-luu',
        '/quen-mat-khau',
        '/dat-lai-mat-khau',
        '/xac-minh',
        '/tam-biet',
        // Khu của người bày hàng, không phải khu của người đi mua.
        '/quan-ly',
      ],
    },
    sitemap: `${DIA_CHI_GOC}/sitemap.xml`,
  };
}
