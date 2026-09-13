import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { HinhHeMay } from '@/components/game/HinhHeMay';
import { BieuDoTai } from '@/components/tac-gia/BieuDoTai';
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

  const [theoNgay, kyTruoc, banDangCam, somNhat] = await Promise.all([
    db.luotTaiNgay.findMany({
      where: { ...locGame, ngay: { gte: tuNgay } },
      select: { ngay: true, heMay: true, so: true },
    }),
    /*
     * KỲ TRƯỚC — 30 ngày liền trước cửa sổ đang xem, để so hơn kém.
     *
     * Một con số đứng trơ trọi thì không ai biết nó to hay nhỏ: "641 lượt" là
     * một tháng đẹp hay một tháng tệ? Chỉ có so với chính mình tháng trước mới
     * trả lời được, và đó là phép so duy nhất cửa hàng này làm được một cách
     * trung thực — không có số của game người khác để mà so.
     */
    db.luotTaiNgay.aggregate({
      where: { ...locGame, ngay: { gte: dauNgayTruoc(SO_NGAY * 2 - 1), lt: tuNgay } },
      _sum: { so: true },
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
    return {
      khoa: ngay.getTime(),
      nhan: nhanNgayVN(ngay),
      tong: cua.reduce((t, d) => t + d.so, 0),
      // Sắp giảm dần để khúc to nhất nằm dưới cùng mỗi cột — cột chồng mà khúc
      // to nằm trên thì mắt đọc thứ tự khác nhau ở mỗi cột.
      he: cua.filter((d) => d.so > 0)
        .map((d) => ({ ma: d.heMay as string, so: d.so }))
        .sort((a, b) => b.so - a.so),
    };
  });

  const tong = oNgay.reduce((t, o) => t + o.tong, 0);
  const caoNhat = Math.max(1, ...oNgay.map((o) => o.tong));
  const homNayCo = oNgay[oNgay.length - 1]?.tong ?? 0;
  const dongNhat = oNgay.reduce((a, b) => (b.tong > a.tong ? b : a), oNgay[0]);
  const trungBinh = tong / SO_NGAY;

  /*
   * Hơn kém bao nhiêu phần trăm so với kỳ trước.
   *
   * Kỳ trước bằng 0 thì KHÔNG in "tăng vô hạn phần trăm" — chia cho 0 ra một
   * con số vô nghĩa, mà "tăng 100%" cũng sai nốt. Lúc ấy nói thẳng là kỳ trước
   * chưa có lượt nào.
   */
  const soKyTruoc = kyTruoc._sum.so ?? 0;
  const doi = soKyTruoc > 0 ? Math.round(((tong - soKyTruoc) / soKyTruoc) * 100) : null;

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

      {/* Bốn con số đứng trên biểu đồ: đọc một cái là biết tháng này ra sao,
          còn biểu đồ trả lời câu tiếp theo là "ra sao theo ngày nào".

          HAI CỘT NGAY TỪ KHỔ ĐIỆN THOẠI, không xếp dọc thành bốn hàng: bốn thẻ
          chồng lên nhau đẩy biểu đồ xuống dưới màn hình đầu tiên, mà biểu đồ
          mới là thứ người ta mở trang này để xem. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <O nhan={`Lượt tải ${SO_NGAY} ngày`} so={gonSo(tong)}
          duoi={doi === null
            ? (soKyTruoc === 0 && tong > 0 ? 'Kỳ trước chưa có lượt nào' : undefined)
            : `${doi >= 0 ? '+' : ''}${doi}% so với ${SO_NGAY} ngày trước đó`}
          chieu={doi === null ? null : doi >= 0} />
        <O nhan="Hôm nay" so={gonSo(homNayCo)} />
        <O nhan="Trung bình mỗi ngày"
          so={trungBinh >= 10 ? gonSo(Math.round(trungBinh)) : trungBinh.toFixed(1).replace('.', ',')} />
        <O nhan="Ngày đông nhất" so={gonSo(dongNhat?.tong ?? 0)}
          duoi={dongNhat && dongNhat.tong > 0 ? dongNhat.nhan : undefined} />
      </section>

      <section className="the p-4">
        {tong === 0 ? (
          <p className="phu">
            Chưa có lượt tải nào trong {SO_NGAY} ngày qua.
            {!somNhat && ' Số liệu theo ngày bắt đầu được ghi từ đợt này, nên game cũ chưa có lịch sử.'}
          </p>
        ) : (
          /*
            Cột cao theo TỈ LỆ so với ngày đông nhất, không theo tổng: chia theo
            tổng thì ba mươi cái cột đều tè le như nhau, không đọc ra hình dáng
            gì.
          */
          <BieuDoTai ngay={oNgay} caoNhat={caoNhat} />
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

/**
 * Một ô số liệu: nhãn nhỏ, con số to, một dòng phụ.
 *
 * `chieu` chỉ tô màu cho dòng phụ khi thật sự có phép so: màu nhấn là hơn kỳ
 * trước, màu cảnh là kém. Không có gì để so thì để chữ mờ như thường — tô màu
 * một dòng chẳng mang tin gì thì chỉ dạy mắt bỏ qua màu ở chỗ khác.
 *
 * Không mượn xanh lá / đỏ: bảng màu của cửa hàng này không có xanh lá, mà đỏ
 * thì đang dành riêng cho lỗi và cảnh báo — một tháng ít lượt tải không phải
 * là một cái lỗi.
 */
function O({ nhan, so, duoi, chieu }: {
  nhan: string;
  so: string;
  duoi?: string;
  chieu?: boolean | null;
}) {
  return (
    <div className="the p-3.5">
      <p className="phu">{nhan}</p>
      <p className="mt-1 text-[24px] font-bold leading-none tabular-nums">{so}</p>
      {duoi && (
        <p className={gop('mt-1.5 text-[12px] font-semibold',
          chieu === true && 'text-nhan',
          chieu === false && 'text-canh',
          chieu == null && 'text-mo')}>
          {duoi}
        </p>
      )}
    </div>
  );
}
