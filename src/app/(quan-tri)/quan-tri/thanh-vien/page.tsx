import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { db } from '@/lib/db';
import { PhanTrang } from '@/components/PhanTrang';
import { NutThanhVien } from '@/components/quan-tri/NutThanhVien';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { cachDay, gonSo, kep, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thành viên' };

const MOI_TRANG = 30;

/*
 * THÀNH VIÊN.
 *
 * Trang này từng CHỈ ĐỌC, và lý do ghi ở đây là "chưa có nhu cầu thật thì chưa
 * mở ra". Nhu cầu ấy nay đã rõ: chuỗi kiểm duyệt dừng ở chỗ gỡ bài, nên người
 * rải bài quay lại rải tiếp và người bán hàng chỉ còn cách gỡ từng bài, mãi.
 * Cột `khoa` vốn đã được canh ở mọi lối vào, tức là phần thi hành sẵn sàng từ
 * lâu — chỉ thiếu đúng cái nút bật nó.
 *
 * Hai mối nguy của mấy nút này — tự phong quản trị, và khoá nốt người quản trị
 * cuối cùng — chặn ở `khoaThanhVien` và `doiVaiTro`, không chặn bằng cách giấu
 * nút đi.
 *
 * Email KHÔNG in ra: người bán hàng cần biết ai đang hoạt động, không cần địa
 * chỉ liên lạc của họ; mà một bảng đầy email là một bảng đáng để người ngoài
 * đi lấy.
 */
export default async function ThanhVien({ searchParams }: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const sp = await searchParams;
  const toi = await nguoiHienTai();

  const tong = await db.nguoiDung.count();
  const tongTrang = soTrang(tong, MOI_TRANG);
  // Kẹp vào khoảng có thật: `?trang=99` trước đây ra một bảng trống trơn, trông
  // y như kho không có thành viên nào.
  const trang = kep(sp.trang, 1, tongTrang, 1);

  const [nguoi] = await Promise.all([
    db.nguoiDung.findMany({
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      skip: (trang - 1) * MOI_TRANG,
      take: MOI_TRANG,
      select: {
        id: true, tenHienThi: true, tenDangNhap: true, anh: true,
        vaiTro: true, khoa: true, taoLuc: true, ghePhutCuoi: true,
        _count: { select: { danhGia: true, luotTai: true, chuDe: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="tieu-de-trang">Thành viên</h1>
        <p className="phu mt-1">{gonSo(tong)} tài khoản</p>
      </div>

      {/*
        BẢNG THẬT trên máy bàn, DANH SÁCH THẺ trên điện thoại — đúng lối trang
        Game bên cạnh.

        Bản cũ chỉ có một cái bảng, giấu bớt bốn cột dưới `sm` rồi thôi. Ba cột
        còn lại vẫn không vừa khổ 390px, mà thẻ bọc lại mang `overflow-hidden`:
        cột "Việc" bị CẮT CỤT ngay giữa chữ, và vì cắt chứ không phải cuộn nên
        không có cách nào với tới. Nghĩa là trên điện thoại, người trực không
        phong hay gỡ vai trò cho ai được — mà mấy cái nút ấy chính là lý do
        trang này thôi chỉ-đọc.

        Nén bảng cho vừa thì không cứu được: hàng nút nào cũng cần chỗ. Nên khổ
        nhỏ đổi hẳn sang thẻ, mỗi người một khối, nút xuống hàng riêng.
      */}
      <div className="the hidden overflow-hidden lg:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="vach-duoi bg-nen3/60 text-left text-[12px] font-semibold text-mo">
              <th scope="col" className="px-3 py-2.5">Thành viên</th>
              <th scope="col" className="px-3 py-2.5 text-right">Đã tải</th>
              <th scope="col" className="px-3 py-2.5 text-right">Đánh giá</th>
              <th scope="col" className="px-3 py-2.5 text-right">Chủ đề</th>
              <th scope="col" className="px-3 py-2.5 text-right">Ghé lần cuối</th>
              <th scope="col" className="px-3 py-2.5 text-right">Tham gia</th>
              <th scope="col" className="px-3 py-2.5 text-right">Việc</th>
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
                <td className="px-3 py-2.5 text-right tabular-nums">{n._count.luotTai}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{n._count.danhGia}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{n._count.chuDe}</td>
                {/* "Ghé lần cuối" đứng TRƯỚC "Tham gia": lúc cân nhắc có khoá
                    một tài khoản hay không, thứ cần biết là họ còn hoạt động
                    không, chứ không phải họ mở tài khoản từ bao giờ. */}
                <td className="px-3 py-2.5 text-right text-mo">
                  {n.ghePhutCuoi ? cachDay(n.ghePhutCuoi) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right text-mo">{cachDay(n.taoLuc)}</td>
                <td className="px-3 py-2.5 text-right">
                  <NutThanhVien id={n.id} ten={n.tenHienThi} vaiTro={n.vaiTro}
                    dangKhoa={n.khoa} laToi={n.id === toi?.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="the divide-y divide-vien lg:hidden">
        {nguoi.map((n) => (
          <li key={n.id} className="space-y-2.5 p-4">
            <div className="flex items-center gap-2.5">
              {n.anh ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.anh} alt="" className="size-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-nen3 text-[13px] font-bold">
                  {n.tenHienThi.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] font-semibold">{n.tenHienThi}</span>
                  {n.vaiTro === 'QUAN_TRI' && (
                    <span className="shrink-0 text-nhan">
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
            </div>

            {/* Mấy con số gộp một dòng: ở khổ này chúng là thông tin phụ, còn
                thứ người trực mở trang ra để làm là hàng nút ngay dưới. */}
            <p className="phu">
              {n._count.luotTai} lượt tải · {n._count.danhGia} đánh giá · {n._count.chuDe} chủ đề
            </p>
            <p className="phu">
              Ghé {n.ghePhutCuoi ? cachDay(n.ghePhutCuoi) : '—'} · tham gia {cachDay(n.taoLuc)}
            </p>

            {/* Hàng nút XUỐNG DÒNG ĐƯỢC — đây đúng là chỗ bản bảng cắt cụt
                mất. Lối xếp mặc định của `NutThanhVien` là dồn về phải cho ô
                cuối của bảng, mà dồn về phải lúc chật thì nút đầu trôi hẳn ra
                ngoài mép trái. */}
            <NutThanhVien id={n.id} ten={n.tenHienThi} vaiTro={n.vaiTro}
              dangKhoa={n.khoa} laToi={n.id === toi?.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-0.5" />
          </li>
        ))}
      </ul>

      <PhanTrang trang={trang} tongTrang={tongTrang}
        dungDuong={(t) => (t > 1 ? `/quan-tri/thanh-vien?trang=${t}` : '/quan-tri/thanh-vien')} />
    </div>
  );
}
