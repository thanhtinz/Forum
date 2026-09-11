import Link from 'next/link';
import type { Metadata } from 'next';
import { Bell, Flag, Inbox, MessageSquare, Star } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { NutDonThongBao } from '@/components/NutDocHet';
import { cachDay, gop } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thông báo' };

/** Hình và sắc theo loại. Tra qua bảng để loại lạ không làm vỡ trang. */
const HINH: Record<string, { icon: React.ReactNode; sac: string }> = {
  TRA_LOI_CHU_DE: { icon: <MessageSquare size={16} />, sac: 'bg-nhan/12 text-nhan' },
  DAP_DANH_GIA: { icon: <Star size={16} />, sac: 'bg-nhan/12 text-nhan' },
  TRA_LOI_YEU_CAU: { icon: <Inbox size={16} />, sac: 'bg-cam/15 text-canh' },
  GO_NOI_DUNG: { icon: <Flag size={16} />, sac: 'bg-xau/10 text-xau' },
};

export default async function ThongBao() {
  const nguoi = await nguoiHienTai();

  if (!nguoi) {
    return (
      <div className="the mx-auto max-w-sm p-8 text-center">
        <Bell size={24} className="mx-auto text-mo" aria-hidden />
        <h1 className="mt-2 text-[16px] font-bold">Chưa đăng nhập</h1>
        <p className="phu mt-1">Đăng nhập để nhận thông báo về bài viết và đánh giá của bạn.</p>
        <Link href="/dang-nhap" className="nut-cai-dam mt-4 !min-h-[38px] !px-5 !text-[13px]">
          Đăng nhập
        </Link>
      </div>
    );
  }

  const ds = await db.thongBao.findMany({
    where: { nguoiId: nguoi.id },
    orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
    take: 60,
    select: { id: true, loai: true, tieuDe: true, chiTiet: true, duongDan: true, daDoc: true, taoLuc: true },
  });

  const chuaDoc = ds.filter((t) => !t.daDoc).length;

  /*
   * Đánh dấu đã đọc SAU khi đã lấy xong danh sách, và KHÔNG chờ kết quả.
   *
   * Sau khi lấy: nhờ vậy lần xem này người ta vẫn thấy mục nào đang in đậm,
   * tức là thấy đúng những gì vừa mới tới. Đánh dấu trước thì mở trang ra là
   * mọi thứ xám như nhau, và cái chuông vừa báo "3 tin mới" hoá ra nói dối.
   *
   * Không chờ: hỏng lượt ghi này thì cùng lắm con số trên chuông chậm một
   * nhịp, còn chặn cả trang lại vì nó thì hỏng cả trang.
   */
  if (chuaDoc > 0) {
    void db.thongBao.updateMany({
      where: { nguoiId: nguoi.id, daDoc: false }, data: { daDoc: true },
    }).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="tieu-de-trang">Thông báo</h1>
          <p className="phu mt-1">
            {chuaDoc > 0 ? `${chuaDoc} mục chưa đọc` : 'Bạn đã đọc hết'}
          </p>
        </div>
        <NutDonThongBao coChuaDoc={chuaDoc > 0} coDaDoc={ds.length > chuaDoc} />
      </div>

      {ds.length === 0 ? (
        <div className="the p-10 text-center">
          <Bell size={22} className="mx-auto text-mo" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold">Chưa có thông báo nào</p>
          <p className="phu mt-1">
            Có người trả lời bài của bạn, hoặc cửa hàng đáp lại đánh giá của bạn,
            thì tin sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <ul className="the divide-y divide-vien">
          {ds.map((t) => {
            const h = HINH[t.loai] ?? { icon: <Bell size={16} />, sac: 'bg-nen3 text-mo' };
            const ruot = (
              <>
                <span className={gop('grid size-9 shrink-0 place-items-center rounded-full', h.sac)}>
                  {h.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={gop('block text-[14px] leading-snug', !t.daDoc && 'font-bold')}>
                    {t.tieuDe}
                  </span>
                  {t.chiTiet && <span className="phu mt-0.5 block dong-2">{t.chiTiet}</span>}
                  <span className="phu mt-0.5 block">{cachDay(t.taoLuc)}</span>
                </span>
                {/* Chấm xanh thay cho nền tô: tô nền cả hàng thì danh sách toàn
                    mục chưa đọc trông như một mảng màu, đọc không ra hàng nào. */}
                {!t.daDoc && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-nhan" />}
              </>
            );

            const lop = 'flex items-start gap-3 px-4 py-3';
            // Thông báo "đã gỡ" không có chỗ nào để đi tới, nên không bọc liên
            // kết: một liên kết bấm vào chẳng ra gì còn tệ hơn không có.
            return (
              <li key={t.id}>
                {t.duongDan ? (
                  <Link href={t.duongDan} className={gop(lop, 'transition-colors hover:bg-nen3')}>
                    {ruot}
                  </Link>
                ) : (
                  <div className={lop}>{ruot}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
