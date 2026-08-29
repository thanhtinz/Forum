import { db } from './db';

/**
 * Bảng xếp hạng của riêng nông trại — không dính gì tới bảng xếp hạng diễn đàn.
 *
 * Xếp theo SỐ ĐƠN ĐÃ GIAO chứ không theo điểm: điểm là của cả trang, ai chăm
 * bầu cua hay chăm viết bài cũng nhiều điểm, mang sang đây thì bảng này chỉ là
 * bảng kia chép lại. Số đơn đã giao thì chỉ nông trại mới sinh ra được.
 *
 * Hoà số đơn thì xét tới số ô đất — người mở rộng ruộng nhiều hơn đứng trên.
 */

export interface HangNongTrai {
  hang: number;
  username: string;
  name: string | null;
  image: string | null;
  soDon: number;
  soO: number;
}

export const BXH_LAY = 20;

export async function bxhNongTrai(): Promise<HangNongTrai[]> {
  // Gom theo người ở tầng cơ sở dữ liệu, không kéo từng đơn về rồi đếm ở
  // JavaScript: một người chơi lâu năm có hàng nghìn đơn đã giao.
  const dem = await db.farmOrder.groupBy({
    by: ['userId'],
    where: { deliveredAt: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { userId: 'desc' } },
    take: BXH_LAY,
  });
  if (dem.length === 0) return [];

  const ids = dem.map((d) => d.userId);
  const [nguoi, oDat] = await Promise.all([
    db.user.findMany({
      where: { id: { in: ids } },
      take: BXH_LAY,
      select: { id: true, username: true, name: true, image: true },
    }),
    db.farmPlot.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const tra = new Map(nguoi.map((n) => [n.id, n]));
  const soO = new Map(oDat.map((o) => [o.userId, o._count._all]));

  return dem
    .map((d) => {
      const n = tra.get(d.userId);
      if (!n?.username) return null;
      return {
        username: n.username,
        name: n.name,
        image: n.image,
        soDon: d._count._all,
        soO: soO.get(d.userId) ?? 0,
      };
    })
    .filter((x): x is Omit<HangNongTrai, 'hang'> => x !== null)
    .sort((a, b) => b.soDon - a.soDon || b.soO - a.soO)
    .map((x, i) => ({ hang: i + 1, ...x }));
}
