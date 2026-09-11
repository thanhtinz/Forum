import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { db } from '@/lib/db';
import { PhanTrang } from '@/components/PhanTrang';
import { cachDay, gonSo } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thành viên' };

const MOI_TRANG = 30;

/*
 * THÀNH VIÊN — CHỈ ĐỌC, cố ý.
 *
 * Không có nút đổi vai trò hay khoá tài khoản ở đây, dù lược đồ có sẵn cả hai
 * cột. Mỗi nút như thế là một hàm `'use server'` mới, tức một địa chỉ POST
 * công khai mới, mà lại là loại nguy hiểm nhất: tự phong quản trị, hoặc khoá
 * đúng người quản trị cuối cùng rồi không ai vào được nữa. Chưa có nhu cầu
 * thật thì chưa mở ra — thêm sau vẫn kịp, gỡ một lỗ hổng thì không.
 *
 * Email KHÔNG in ra: người coi kho cần biết ai đang hoạt động, không cần địa
 * chỉ liên lạc của họ; mà một bảng đầy email là một bảng đáng để người ngoài
 * đi lấy.
 */
export default async function ThanhVien({ searchParams }: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const sp = await searchParams;
  const trang = Math.max(1, Number(sp.trang) || 1);

  const [tong, nguoi] = await Promise.all([
    db.nguoiDung.count(),
    db.nguoiDung.findMany({
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      skip: (trang - 1) * MOI_TRANG,
      take: MOI_TRANG,
      select: {
        id: true, tenHienThi: true, tenDangNhap: true, anh: true,
        vaiTro: true, khoa: true, taoLuc: true,
        _count: { select: { danhGia: true, luotTai: true, chuDe: true } },
      },
    }),
  ]);

  const tongTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="tieu-de-trang">Thành viên</h1>
        <p className="phu mt-1">{gonSo(tong)} tài khoản</p>
      </div>

      <div className="the overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="vach-duoi bg-nen3/60 text-left text-[12px] font-semibold text-mo">
              <th scope="col" className="px-3 py-2.5">Thành viên</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right sm:table-cell">Đã tải</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right sm:table-cell">Đánh giá</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right sm:table-cell">Chủ đề</th>
              <th scope="col" className="px-3 py-2.5 text-right">Tham gia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vien">
            {nguoi.map((n) => (
              <tr key={n.id}>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    {n.anh ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.anh} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-nen3 text-[12px] font-bold">
                        {n.tenHienThi.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-semibold">{n.tenHienThi}</span>
                        {n.vaiTro === 'QUAN_TRI' && (
                          <span title="Quản trị viên" className="shrink-0 text-nhan">
                            <Shield size={13} aria-label="Quản trị viên" />
                          </span>
                        )}
                        {n.khoa && (
                          <span className="shrink-0 rounded-full bg-xau/10 px-1.5 py-0.5 text-[10px] font-bold text-xau">
                            đã khoá
                          </span>
                        )}
                      </span>
                      <span className="phu block truncate">@{n.tenDangNhap}</span>
                    </span>
                  </span>
                </td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{n._count.luotTai}</td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{n._count.danhGia}</td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{n._count.chuDe}</td>
                <td className="px-3 py-2.5 text-right text-mo">{cachDay(n.taoLuc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PhanTrang trang={trang} tongTrang={tongTrang}
        dungDuong={(t) => (t > 1 ? `/quan-tri/thanh-vien?trang=${t}` : '/quan-tri/thanh-vien')} />
    </div>
  );
}
