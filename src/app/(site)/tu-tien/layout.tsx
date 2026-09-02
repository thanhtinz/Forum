import type { CSSProperties, ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mauDao } from '@/lib/tu-tien-const';
import { ThanhTab } from '@/components/tutien/ThanhTab';

export const dynamic = 'force-dynamic';

/**
 * Khung chung cho mọi trang của Vạn Đạo Tu Tiên.
 *
 * Thanh tab đặt ở đây chứ không rải vào từng trang, đúng lối hai đảo kia. Chưa
 * tạo nhân vật thì không dựng thanh nào cả — lúc ấy chỉ có đúng một việc để
 * làm là lập đạo hiệu.
 *
 * Màu accent của ĐẠO cũng đặt ở đây chứ không ở từng trang: blueprint mục 1
 * chốt "năm đạo phải khác nhau — màu, resource bar, skill rhythm và widget đặc
 * thù thay đổi theo đạo", mà đổi màu giữa chừng lúc đi từ Bế Quan sang Thế
 * Giới thì hỏng ngay ý ấy. Đặt một lần ở khung thì mọi thanh, mọi nút, mọi
 * vạch bên trong đều tự ăn theo qua biến `--tien-dao`.
 *
 * KHÔNG có đường lùi về khu giải trí: game này đứng riêng như Nông trại, Đảo
 * Pokémon và Đảo Rồng — `/giai-tri` chỉ là chỗ bày cả bốn cho dễ thấy chứ
 * không phải trang cha.
 */
export default async function KhungTuTien({ children }: { children: ReactNode }) {
  const s = await auth();
  const userId = s?.user?.id;
  const nv = userId
    ? await db.tienNhanVat.findUnique({ where: { userId }, select: { dao: true } })
    : null;

  return (
    <div
      className="tien-khu mx-auto max-w-2xl space-y-4"
      style={nv ? ({ '--tien-dao': mauDao(nv.dao) } as CSSProperties) : undefined}
    >
      {nv && <ThanhTab />}
      {children}
    </div>
  );
}
