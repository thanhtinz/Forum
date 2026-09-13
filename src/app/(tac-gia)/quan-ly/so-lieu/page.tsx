import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { HinhHeMay } from '@/components/game/HinhHeMay';
import { MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { dauNgayTruoc, nhanNgayVN } from '@/lib/ngay-vn-const';
import { gonSo, gop } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Số liệu' };

/** Bao nhiêu ngày trên biểu đồ. Ba mươi là một tháng — đủ thấy nhịp tuần. */
const SO_NGAY = 30;

/*
 * SỐ LIỆU CỦA TÁC GIẢ.
 *
 * VÌ SAO CẦN: tổng quan chỉ có mấy con số CỘNG DỒN từ ngày game lên kệ. Cộng
 * dồn thì chỉ đi lên, nên nó không trả lời được câu người bày hàng thật sự
 * hỏi: bản mới ra có ai tải không, cái bài viết hôm qua có kéo được ai về
 * không, còn ai tải bản Java nữa không hay dẹp đi cho rồi.
 *
 * Cả trang chỉ in thứ ĐẾM ĐƯỢC, không ước lượng gì. Cửa hàng này không có công
 * cụ đo hành vi nào, nên mọi con số ở đây đều là một lượt tải thật đã xảy ra —
 * và chỗ nào số liệu chưa có thì nói thẳng là chưa có, chứ không vẽ một đường
 * phẳng cho đẹp biểu đồ.
 *
 * Biểu đồ vẽ bằng div, không kéo thư viện: ba mươi cái cột cao thấp thì CSS
 * làm xong trong mười dòng, mà thêm một thư viện vẽ đồ thị là thêm vài chục
 * kilobyte vào bản dựng của một cửa hàng mà nửa số khách vào bằng máy yếu.
 */
export default async function SoLieuTacGia(
  { searchParams }: { searchParams: Promise<{ game?: string }> },
) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap?callbackUrl=/quan-ly/so-lieu');

  const sp = await searchParams;

  const game = await db.game.findMany({
    where: { tacGiaId: nguoi.id },
    orderBy: [{ soLuotTai: 'desc' }, { id: 'asc' }],
    select: { id: true, ten: true },
  });

  if (game.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="tieu-de-trang">Số liệu</h1>
        <div className="the p-8 text-center">
          <p className="text-[14px] font-semibold">Chưa có gì để đếm</p>
          <p className="phu mt-1">Số liệu bắt đầu chạy từ lượt tải đầu tiên của game bạn.</p>
          <Link href="/quan-ly/game/moi" className="nut-cai-dam mt-4">Thêm game đầu tiên</Link>
        </div>
      </div>
    );
  }

  /*
   * Id game lấy từ địa chỉ, nên phải soi lại nó có nằm trong danh sách game
   * CỦA NGƯỜI NÀY không. Không soi thì gõ tay id game của người khác vào địa
   * chỉ là xem được số liệu của họ.
   */
  const chonId = game.some((g) => g.id === sp.game) ? sp.game! : null;
  const locGame = chonId ? { gameId: chonId } : { gameId: { in: game.map((g) => g.id) } };

  const tuNgay = dauNgayTruoc(SO_NGAY - 1);

  const [theoNgay, banDangCam, somNhat] = await Promise.all([
    db.luotTaiNgay.findMany({
      where: { ...locGame, ngay: { gte: tuNgay } },
      select: { ngay: true, heMay: true, so: true },
    }),
    /*
     * "Bản người chơi đang cầm" — gom từ `LuotTai`, không từ bảng theo ngày.
     *
     * Hai bảng trả lời hai câu khác nhau, và trộn chúng là sai: bảng theo ngày
     * đếm LƯỢT (một người tải ba lần là ba), còn bảng này mỗi người mỗi game
     * đúng một hàng ghi bản họ tải gần nhất — tức là số MÁY đang chạy bản ấy.
     * Người bày hàng cần đúng con số thứ hai để biết bỏ hỗ trợ bản cũ được
     * chưa.
     */
    db.luotTai.groupBy({
      by: ['soHieu'],
      where: locGame,
      _count: { _all: true },
      orderBy: { _count: { soHieu: 'desc' } },
      take: 8,
    }),
    db.luotTaiNgay.findFirst({
      where: locGame, orderBy: { ngay: 'asc' }, select: { ngay: true },
    }),
  ]);

  // Dựng đủ 30 ô ngày kể cả ngày không ai tải: bỏ trống mấy ngày ấy thì biểu đồ
  // co lại và hai cột cách nhau ba ngày trông như cạnh nhau.
  const oNgay = Array.from({ length: SO_NGAY }, (_, i) => {
    const ngay = dauNgayTruoc(SO_NGAY - 1 - i);
    const cua = theoNgay.filter((d) => d.ngay.getTime() === ngay.getTime());
    return { ngay, so: cua.reduce((t, d) => t + d.so, 0) };
  });

  const tong = oNgay.reduce((t, o) => t + o.so, 0);
  const caoNhat = Math.max(1, ...oNgay.map((o) => o.so));
  const homNayCo = oNgay[oNgay.length - 1]?.so ?? 0;

  const theoHe = new Map<string, number>();
  for (const d of theoNgay) theoHe.set(d.heMay, (theoHe.get(d.heMay) ?? 0) + d.so);
  const heSapXep = [...theoHe.entries()].sort((a, b) => b[1] - a[1]);

  const tongMay = banDangCam.reduce((t, b) => t + b._count._all, 0);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="tieu-de-trang">Số liệu</h1>
        <p className="phu mt-1">Lượt tải thật trong {SO_NGAY} ngày gần đây</p>
      </div>

      {/* Chọn game bằng chip <Link>, không phải ô chọn gọi JavaScript: dán được
          địa chỉ số liệu của một game cho người khác, và nút Lùi quay đúng chỗ. */}
      {game.length > 1 && (
        <div className="ke gap-2">
          <Link href="/quan-ly/so-lieu"
            className={gop('chip shrink-0', !chonId && 'chip-chon')}>
            Tất cả game
          </Link>
          {game.map((g) => (
            <Link key={g.id} href={`/quan-ly/so-lieu?game=${g.id}`}
              className={gop('chip shrink-0', chonId === g.id && 'chip-chon')}>
              {g.ten}
            </Link>
          ))}
        </div>
      )}

      <section className="the p-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="phu">Lượt tải {SO_NGAY} ngày qua</p>
            <p className="mt-0.5 text-[30px] font-bold leading-none tabular-nums">{gonSo(tong)}</p>
          </div>
          <p className="phu">
            Hôm nay: <span className="font-semibold text-chu tabular-nums">{gonSo(homNayCo)}</span>
          </p>
        </div>

        {tong === 0 ? (
          <p className="phu mt-4">
            Chưa có lượt tải nào trong {SO_NGAY} ngày qua.
            {!somNhat && ' Số liệu theo ngày bắt đầu được ghi từ đợt này, nên game cũ chưa có lịch sử.'}
          </p>
        ) : (
          <>
            {/*
              Cột cao theo TỈ LỆ so với ngày đông nhất, không theo tổng: chia
              theo tổng thì ba mươi cái cột đều tè le như nhau, không đọc ra
              hình dáng gì. Cột của ngày không có lượt nào vẫn giữ một vạch mỏng
              — để mắt thấy được cái ngày ấy tồn tại chứ không phải bị bỏ sót.
            */}
            <div className="mt-4 flex h-28 items-end gap-[3px]">
              {oNgay.map((o) => (
                <div key={o.ngay.getTime()}
                  title={`${nhanNgayVN(o.ngay)}: ${o.so} lượt`}
                  className="flex-1 rounded-t-[3px] bg-nhan/80"
                  style={{ height: `${Math.max(2, (o.so / caoNhat) * 100)}%` }} />
              ))}
            </div>
            <div className="phu mt-1.5 flex justify-between">
              <span>{nhanNgayVN(oNgay[0].ngay)}</span>
              <span>{nhanNgayVN(oNgay[oNgay.length - 1].ngay)}</span>
            </div>
          </>
        )}
      </section>

      {heSapXep.length > 0 && (
        <section>
          <h2 className="tieu-de mb-3">Tải theo hệ máy</h2>
          <ul className="the-noi danh-sach-the">
            {heSapXep.map(([he, so]) => (
              <li key={he} className="flex items-center gap-3 p-3.5">
                <span className="shrink-0 text-mo"><HinhHeMay he={he as MaHeMay} co={20} /></span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                  {MO_TA_HE[he as MaHeMay]?.ten ?? he}
                </span>
                <span className="phu tabular-nums">{Math.round((so / tong) * 100)}%</span>
                <span className="w-14 shrink-0 text-right text-[14px] font-bold tabular-nums">
                  {gonSo(so)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tongMay > 0 && (
        <section>
          <h2 className="tieu-de mb-1">Bản người chơi đang cầm</h2>
          <p className="phu mb-3">
            Mỗi người tính một lần, theo bản họ tải gần nhất — con số này nói còn
            bao nhiêu máy đang chạy bản cũ.
          </p>
          <ul className="the-noi danh-sach-the">
            {banDangCam.map((b) => (
              <li key={b.soHieu ?? 'khong-ro'} className="flex items-center gap-3 p-3.5">
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                  {b.soHieu ? `Bản ${b.soHieu}` : 'Không rõ bản'}
                </span>
                <span className="phu tabular-nums">
                  {Math.round((b._count._all / tongMay) * 100)}%
                </span>
                <span className="w-14 shrink-0 text-right text-[14px] font-bold tabular-nums">
                  {gonSo(b._count._all)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {somNhat && (
        <p className="phu">
          Số liệu theo ngày ghi từ {nhanNgayVN(somNhat.ngay)}; lượt tải trước đó chỉ
          còn trong con số cộng dồn ở trang Tổng quan.
        </p>
      )}
    </div>
  );
}
