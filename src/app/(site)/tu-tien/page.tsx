import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { chotBeQuan, xemNhanVat } from '@/lib/tu-tien';
import { TheNhanVat } from '@/components/tutien/TheNhanVat';
import { BeQuan } from '@/components/tutien/BeQuan';
import { CanhBaoDotPha } from '@/components/tutien/CanhBaoDotPha';
import { BAC_TOI_DA, CANH_GIOI, DAO, SO_TANG } from '@/lib/tu-tien-const';

export const metadata: Metadata = { title: 'Vạn Đạo Tu Tiên' };
export const dynamic = 'force-dynamic';

/**
 * Đạo Đường — trang chính.
 *
 * Ba nhánh, vì ba tình cảnh khác hẳn nhau: khách vãng lai cần lời mời đăng
 * nhập, người chưa lập đạo hiệu cần đúng một việc là lập, còn người đang tu
 * thì cần thấy cảnh giới và tu vi của mình.
 *
 * Chốt bế quan ngay ở đây, TRƯỚC khi đọc: chốt sau thì trang bày tu vi cũ đúng
 * một lượt tải rồi tự đổi khi bấm lại — nhìn ra một con số nhảy loạn.
 */
export default async function TrangTuTien() {
  const s = await auth();
  const userId = s?.user?.id ?? null;

  if (userId) await chotBeQuan(userId);
  const nv = userId ? await xemNhanVat(userId) : null;

  if (!userId) {
    return (
      <>
        <h1 className="text-xl font-black">Vạn Đạo Tu Tiên</h1>
        <GioiThieu />
        <section className="tien-tam p-5">
          <p className="text-sm">
            <Link href="/login?callbackUrl=/tu-tien" className="tien-dao-mau font-bold hover:underline">
              Đăng nhập
            </Link>{' '}để lập đạo hiệu.
          </p>
        </section>
      </>
    );
  }

  if (!nv) {
    return (
      <>
        <h1 className="text-xl font-black">Vạn Đạo Tu Tiên</h1>
        <GioiThieu />
        <Link href="/tu-tien/tao" className="tien-nut block px-4 py-3 text-center text-base">
          Lập đạo hiệu
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-black">Đạo Đường</h1>
      <TheNhanVat nv={nv} />
      {/* Cảnh báo đứng TRÊN bế quan: lúc đã đủ điều kiện thì bế quan là việc
          vô nghĩa, để nó ở trên là chỉ sai việc. */}
      <CanhBaoDotPha nv={nv} />
      <BeQuan nv={nv} />
    </>
  );
}

/**
 * Lời mở, dùng chung cho hai nhánh chưa vào game.
 *
 * Cố ý KHÔNG có ảnh, emoji hay icon nào — xem chú thích đầu `tu-tien-const.ts`:
 * đây là dòng game chữ, chữ chính là giao diện.
 */
function GioiThieu() {
  return (
    <section className="tien-tam p-5">
      <p className="mb-3 text-sm">
        Bắt đầu là phàm nhân. Chọn một trong năm đạo, tu tới cảnh giới, rồi độ
        kiếp mà lên bậc. Cảnh giới cao không bảo đảm thắng — công pháp, pháp
        bảo và cách đánh vẫn quyết định.
      </p>
      <ul className="mb-3 space-y-1 text-sm">
        {DAO.map((d) => (
          <li key={d.ma} className="flex flex-wrap gap-x-2">
            <b>{d.ten}</b>
            <span className="opacity-75">{d.loiChoi}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm opacity-75">
        Giai đoạn này mở {BAC_TOI_DA} đại cảnh giới đầu, mỗi bậc {SO_TANG} tầng —
        từ {CANH_GIOI[0]!.ten.linh} tới {CANH_GIOI[BAC_TOI_DA - 1]!.ten.linh}.
        Rời trang vẫn tu: máy chủ gom tu vi theo thời gian trôi.
      </p>
    </section>
  );
}
