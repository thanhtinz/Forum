import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { DIA_CHI_GOC } from '@/lib/dia-chi-goc';

/**
 * Sơ đồ trang cho máy tìm kiếm.
 *
 * Chỉ liệt kê thứ CÔNG KHAI và ỔN ĐỊNH: trang game, trang thể loại, trang nhà
 * phát triển, và vài lối chính. Không có trang cá nhân (chặn ở `robots.ts`),
 * không có trang kết quả lọc — `/duyet?he=JAVA&sap=ten&trang=3` sinh ra hàng
 * nghìn tổ hợp mà nội dung thì trùng nhau, đó là cách nhanh nhất để máy tìm
 * kiếm coi cả trang là rác.
 *
 * `lastModified` lấy từ `suaLuc` thật của từng game, không phải `new Date()`.
 * Khai bừa "vừa sửa xong" cho mọi trang ở mọi lượt hỏi thì máy tìm kiếm học
 * được rằng con số ấy vô nghĩa và thôi tin nó.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [game, theLoai, hang] = await Promise.all([
    db.game.findMany({
      where: DANG_HIEN,
      orderBy: { suaLuc: 'desc' },
      take: 5000,
      select: { duongDan: true, suaLuc: true },
    }),
    db.theLoai.findMany({ orderBy: { thuTu: 'asc' }, take: 100, select: { duongDan: true } }),
    // `distinct` thay cho `groupBy` vì chỉ cần danh sách tên, không cần đếm.
    db.game.findMany({
      where: { ...DANG_HIEN, nhaPhatTrien: { not: null } },
      distinct: ['nhaPhatTrien'],
      take: 500,
      select: { nhaPhatTrien: true },
    }),
  ]);

  const moiNhat = game[0]?.suaLuc ?? new Date();

  return [
    { url: `${DIA_CHI_GOC}/`, lastModified: moiNhat, changeFrequency: 'daily', priority: 1 },
    { url: `${DIA_CHI_GOC}/game`, lastModified: moiNhat, changeFrequency: 'daily', priority: 0.9 },
    { url: `${DIA_CHI_GOC}/bxh`, lastModified: moiNhat, changeFrequency: 'daily', priority: 0.8 },
    { url: `${DIA_CHI_GOC}/duyet`, lastModified: moiNhat, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${DIA_CHI_GOC}/an-toan`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${DIA_CHI_GOC}/yeu-cau`, changeFrequency: 'monthly', priority: 0.3 },

    ...game.map((g) => ({
      url: `${DIA_CHI_GOC}/game/${g.duongDan}`,
      lastModified: g.suaLuc,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),

    ...theLoai.map((t) => ({
      url: `${DIA_CHI_GOC}/duyet?the-loai=${t.duongDan}`,
      lastModified: moiNhat,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),

    ...hang
      .map((h) => h.nhaPhatTrien)
      .filter((x): x is string => !!x)
      .map((ten) => ({
        url: `${DIA_CHI_GOC}/nha-phat-trien/${encodeURIComponent(ten)}`,
        lastModified: moiNhat,
        changeFrequency: 'monthly' as const,
        priority: 0.4,
      })),
  ];
}
