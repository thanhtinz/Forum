import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { BieuMauGui } from '@/components/BieuMauGui';
import { guiYeuCau } from './viec';
import { cachDay, gop } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Yêu cầu game' };

/** Nhãn và màu cho từng trạng thái — khai báo một chỗ để hai nơi dùng chung. */
const TRANG_THAI: Record<string, { ten: string; lop: string }> = {
  CHO_XEM: { ten: 'Chờ xem', lop: 'bg-nen3 text-mo' },
  DANG_TIM: { ten: 'Đang tìm', lop: 'bg-canh/15 text-canh' },
  DA_THEM: { ten: 'Đã thêm', lop: 'bg-nhan/12 text-nhan' },
  TU_CHOI: { ten: 'Không tìm được', lop: 'bg-xau/10 text-xau' },
};

/*
 * TRANG YÊU CẦU GAME.
 *
 * Cửa hàng game cũ thì bao giờ cũng thiếu — thứ người ta tìm thường là một cái tên
 * họ nhớ mang máng từ mười lăm năm trước. Mục này biến cái ngõ cụt "không tìm
 * thấy" thành một lời nhắn, và danh sách công khai bên dưới cho người sau thấy
 * game mình định xin đã có ai xin rồi hay chưa.
 */
export default async function TrangYeuCau() {
  const nguoi = await nguoiHienTai();

  const [ganDay, cuaToi] = await Promise.all([
    db.yeuCau.findMany({
      orderBy: { taoLuc: 'desc' },
      take: 30,
      select: {
        id: true, ten: true, trangThai: true, loiNhan: true, taoLuc: true,
        nguoi: { select: { tenHienThi: true } },
      },
    }),
    nguoi
      ? db.yeuCau.count({ where: { nguoiId: nguoi.id } })
      : 0,
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="tieu-de-trang">Yêu cầu game</h1>
        <p className="phu mt-0.5">
          Không thấy game bạn cần trong cửa hàng? Cho biết tên, SunnyStore sẽ đi tìm.
        </p>
      </div>

      {nguoi ? (
        <div className="the p-4">
          <BieuMauGui viec={guiYeuCau} nut="Gửi yêu cầu" xoaSauKhiGui>
            <label className="block">
              <span className="phu mb-1 block">Tên game</span>
              <input name="ten" required minLength={2} maxLength={150} className="o-nhap"
                placeholder="Nhớ được bao nhiêu cứ ghi bấy nhiêu" />
            </label>
            <label className="block">
              <span className="phu mb-1 block">Mô tả thêm (không bắt buộc)</span>
              <textarea name="ghiChu" maxLength={1000} rows={3} className="o-nhap"
                placeholder="Hãng nào làm, chơi trên máy gì, nội dung ra sao… càng nhiều manh mối càng dễ tìm." />
            </label>
          </BieuMauGui>
          {cuaToi > 0 && <p className="phu mt-3">Bạn đã gửi {cuaToi} yêu cầu.</p>}
        </div>
      ) : (
        <div className="the p-5 text-center">
          <p className="text-[14px] font-semibold">Đăng nhập để gửi yêu cầu</p>
          <p className="phu mt-1">Cần tài khoản để SunnyStore còn biết trả lời cho ai.</p>
          <Link href="/dang-nhap" className="nut-xam mt-3">Đăng nhập</Link>
        </div>
      )}

      <section>
        <h2 className="tieu-de mb-3">Mọi người đang tìm gì</h2>
        {ganDay.length === 0 ? (
          <p className="the p-6 text-center text-[13px] text-mo">Chưa có yêu cầu nào.</p>
        ) : (
          <ul className="the divide-y divide-vien">
            {ganDay.map((y) => {
              const tt = TRANG_THAI[y.trangThai] ?? TRANG_THAI.CHO_XEM;
              return (
                <li key={y.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{y.ten}</p>
                      <p className="phu mt-0.5 truncate">
                        {y.nguoi.tenHienThi} · {cachDay(y.taoLuc)}
                      </p>
                    </div>
                    <span className={gop('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', tt.lop)}>
                      {tt.ten}
                    </span>
                  </div>
                  {y.loiNhan && (
                    <p className="phu mt-2 rounded-nut bg-nen3 px-3 py-2">
                      SunnyStore: {y.loiNhan}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
