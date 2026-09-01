import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ThanhTab } from '@/components/tutien/ThanhTab';

export const dynamic = 'force-dynamic';

/**
 * Khung chung cho mọi trang của Vạn Đạo Tu Tiên.
 *
 * Thanh tab đặt ở đây chứ không rải vào từng trang, đúng lối hai đảo kia. Chưa
 * tạo nhân vật thì không dựng thanh nào cả — lúc ấy chỉ có đúng một việc để
 * làm là lập đạo hiệu.
 *
 * KHÔNG có đường lùi về khu giải trí: game này đứng riêng như Nông trại, Đảo
 * Pokémon và Đảo Rồng — `/giai-tri` chỉ là chỗ bày cả bốn cho dễ thấy chứ
 * không phải trang cha.
 */
export default async function KhungTuTien({ children }: { children: ReactNode }) {
  const s = await auth();
  const userId = s?.user?.id;
  const co = userId
    ? (await db.tienNhanVat.count({ where: { userId } })) > 0
    : false;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {co && <ThanhTab />}
      {children}
    </div>
  );
}
