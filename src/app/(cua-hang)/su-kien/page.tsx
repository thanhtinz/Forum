import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { TheSuKien } from '@/components/game/TheSuKien';
import { PhanTrang } from '@/components/PhanTrang';
import { kep, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sự kiện',
  description: 'Giải đấu, bản cập nhật lớn và dịp đặc biệt đang diễn ra ở SunnyStore.',
};

/** Bao nhiêu sự kiện một trang. Thẻ to nên một trang vừa mắt là chừng này. */
const MOI_TRANG = 12;

/*
 * SỰ KIỆN CỦA CẢ CỬA HÀNG.
 *
 * VÌ SAO CẦN TRANG NÀY: sự kiện xưa nay chỉ sống trong trang của đúng một game,
 * mà nó lại là thứ HẾT HẠN NHANH NHẤT trên cửa hàng — vài ngày là tàn. Ai không
 * mở đúng trang game ấy trong đúng mấy ngày ấy thì coi như không bao giờ biết
 * có sự kiện. Bày ra một chỗ chung thì cái công người bày hàng dựng sự kiện mới
 * có người xem.
 *
 * CHIA HAI NHÓM, không trộn một dãy: "đang diễn ra" là thứ vào chơi được ngay,
 * "sắp tới" là thứ để nhớ lịch. Hai việc khác nhau, mà trộn lẫn thì người ta
 * phải đọc từng dòng ngày tháng mới biết cái nào là cái nào.
 *
 * Sắp xếp cũng khác nhau theo nhóm, và đây là chỗ dễ làm ẩu: nhóm đang diễn ra
 * xếp theo NGÀY KẾT THÚC gần nhất — cái sắp tàn phải được nhìn thấy trước;
 * nhóm sắp tới xếp theo NGÀY MỞ gần nhất — cái mở sớm nhất là cái đáng chờ.
 */
export default async function TrangSuKien(
  { searchParams }: { searchParams: Promise<{ trang?: string }> },
) {
  const sp = await searchParams;
  const nay = new Date();

  const loc = {
    hien: true,
    ketThuc: { gte: nay },
    game: { ...DANG_HIEN },
  };

  const chon = {
    id: true, loai: true, tieuDe: true, moTaNgan: true, anh: true,
    batDau: true, ketThuc: true,
    game: { select: { ten: true, duongDan: true, icon: true } },
  } as const;

  const dangChay = await db.suKien.findMany({
    where: { ...loc, batDau: { lte: nay } },
    orderBy: [{ ketThuc: 'asc' }, { id: 'asc' }],
    select: chon,
  });

  /*
   * Chỉ nhóm SẮP TỚI mới cắt trang.
   *
   * Nhóm đang diễn ra là thứ người ta vào đây để xem, và số sự kiện còn hiệu
   * lực cùng lúc trên một cửa hàng thì không bao giờ nhiều — cắt trang nó chỉ
   * tổ giấu mất mấy cái ở cuối. Nhóm sắp tới thì ngược lại: người bày hàng hẹn
   * trước được bao nhiêu tuỳ thích, nên nó là chỗ dài ra vô hạn.
   */
  const sapToi = { where: { ...loc, batDau: { gt: nay } } };
  const tongSapToi = await db.suKien.count(sapToi);
  const tongTrang = soTrang(tongSapToi, MOI_TRANG);
  const trang = kep(sp.trang, 1, tongTrang, 1);

  const sap = await db.suKien.findMany({
    ...sapToi,
    orderBy: [{ batDau: 'asc' }, { id: 'asc' }],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: chon,
  });

  const trong = dangChay.length === 0 && tongSapToi === 0;

  return (
    <div className="space-y-7">
      <header>
        <h1 className="tieu-de-trang">Sự kiện</h1>
        <p className="phu mt-1">
          Giải đấu, bản cập nhật lớn và dịp đặc biệt trong mấy game đang bày ở cửa hàng.
        </p>
      </header>

      {trong && (
        <p className="phu">
          Chưa có sự kiện nào đang mở. Ghé lại sau nhé — hoặc theo dõi thẳng trang
          của game bạn đang chơi.
        </p>
      )}

      {dangChay.length > 0 && (
        <section>
          <h2 className="tieu-de mb-3">Đang diễn ra</h2>
          <Luoi bay={dangChay} />
        </section>
      )}

      {sap.length > 0 && (
        <section>
          <h2 className="tieu-de mb-3">Sắp tới</h2>
          <Luoi bay={sap} />
          <div className="mt-5">
            <PhanTrang trang={trang} tongTrang={tongTrang}
              dungDuong={(t) => (t > 1 ? `/su-kien?trang=${t}` : '/su-kien')} />
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * LƯỚI chứ không phải kệ cuộn ngang.
 *
 * Kệ ngang là dáng của một mục PHỤ nằm giữa trang khác — quẹt qua rồi đi tiếp.
 * Còn đây là cả một trang dành riêng cho sự kiện, người ta vào để xem hết, nên
 * phải bày hết ra chứ không bắt quẹt.
 */
function Luoi({ bay }: {
  bay: {
    id: string; loai: string; tieuDe: string; moTaNgan: string; anh: string | null;
    batDau: Date; ketThuc: Date;
    game: { ten: string; duongDan: string; icon: string | null };
  }[];
}) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {bay.map((s) => (
        <li key={s.id}>
          <TheSuKien duongDanGame={s.game.duongDan} anTinhTrang
            game={{ ten: s.game.ten, icon: s.game.icon }}
            s={{
              id: s.id, loai: s.loai, tieuDe: s.tieuDe, moTaNgan: s.moTaNgan, anh: s.anh,
              batDau: s.batDau.toISOString(), ketThuc: s.ketThuc.toISOString(),
            }} />
        </li>
      ))}
    </ul>
  );
}
