import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { SO_GYM } from '@/lib/pokemon-const';
import { tienDoNhiemVu } from '@/lib/pokemon';
import { ThanhTab } from '@/components/pokemon/ThanhTab';
import { bienCanh } from '@/lib/pokemon-giao-dien';

export const dynamic = 'force-dynamic';

/**
 * Khung chung cho mọi trang của Đảo Pokémon.
 *
 * Thanh tab nằm ở đây chứ không rải vào từng trang: mười bốn lối đi mà mỗi
 * trang con chỉ có một liên kết "quay lại" thì đi từ kho sang chợ mất hai lần
 * chạm. Chưa tạo nhân vật thì không dựng thanh nào cả — lúc ấy chỉ có đúng
 * một việc để làm là tạo nhân vật.
 */
export default async function KhungPokemon({ children }: { children: ReactNode }) {
  const s = await auth();
  const userId = s?.user?.id;
  const nv = userId
    ? await db.pokeNhanVat.findUnique({
        where: { userId },
        select: { id: true, huyChuong: true, nhiemVu: true, khu: true },
      })
    : null;

  let nhan: Record<string, string> | undefined;
  if (nv) {
    const tienDo = await tienDoNhiemVu(nv.id);
    nhan = {
      '/pokemon/gym': `${nv.huyChuong}/${SO_GYM}`,
      // Chỉ báo khi có thưởng CHƯA nhận — số đếm suông thì chẳng nhắc được gì.
      ...(tienDo[nv.nhiemVu] ? { '/pokemon/nhiem-vu': '!' } : {}),
    };
  }

  // Biến màu của khu đang đứng đặt ở KHUNG chứ không ở từng trang: thanh tab,
  // cửa hàng, kho thú… đều ăn theo cùng một tông với bản đồ, nên đi giữa các
  // trang không thấy đổi da đổi thịt giữa chừng.
  return (
    <div style={bienCanh(nv?.khu ?? 'co')} className="mx-auto max-w-2xl space-y-4">
      {nv && <ThanhTab nhan={nhan} />}
      {children}
    </div>
  );
}
