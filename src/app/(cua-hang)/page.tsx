import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN, layKe } from '@/lib/danh-muc';
import { CHON_THE, thanhThe, type TheGame } from '@/components/game/the-game';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { HangGame } from '@/components/game/HangGame';
import { NutCai } from '@/components/game/NutCai';
import { NenGame } from '@/components/game/NenGame';
import { NutCaiUngDung } from '@/components/vo/NutCaiUngDung';
import { chiaHomNay } from '@/lib/hom-nay-const';
import { catChu } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

/*
 * TAB "HÔM NAY" — chép lối tab Today của App Store.
 *
 * Không phải một danh mục bày ra để lọc, mà một trang có người biên tập: mỗi
 * ngày vài game, mỗi game một tấm to, có dòng nhãn nói VÌ SAO nó nằm đó.
 *
 * MỖI NGÀY MỘT BỘ, VÀ KHÔNG TRÙNG cho tới khi đi hết danh mục — cách chia nằm ở
 * `hom-nay-const.ts`, và có một kịch bản duyệt hàng trăm ngày liền để soát.
 * Nói ngắn: coi cả cửa hàng là một cỗ bài, đầu mỗi vòng xáo một lần rồi mỗi ngày
 * chia ra vài lá. Trong một vòng, mỗi lá đi qua tay đúng một lần.
 *
 * Câu chữ trên thẻ lấy từ chính phần giới thiệu do người nhập game viết. Kho
 * này chưa có ban biên tập, mà bịa ra một giọng biên tập thì là nói thay một
 * người không tồn tại.
 */

/** Bốn game mỗi ngày: một tấm lớn, ba game trong thẻ bộ sưu tập. */
const MOI_NGAY = 4;

export default async function HomNay() {
  /*
   * Lấy id của CẢ KHO để xáo. Chỉ một cột, không kèm gì khác.
   *
   * Sắp theo `id` để thứ tự trước khi xáo luôn cố định — xáo một cỗ bài đã bị
   * xếp lộn xộn thì cùng một ngày lại ra hai kết quả khác nhau.
   *
   * Kho tới hàng chục nghìn game thì nên chuyển sang một bảng lịch tính sẵn;
   * ở cỡ hiện tại, đọc một cột id vẫn rẻ hơn nhiều so với việc dựng thêm bảng.
   */
  const tatCa = await db.game.findMany({
    where: DANG_HIEN, orderBy: { id: 'asc' }, select: { id: true },
  });

  if (tatCa.length === 0) return <KhoTrong />;

  const { chon } = chiaHomNay(tatCa.map((g) => g.id), MOI_NGAY);

  const [duocChon, moi] = await Promise.all([
    db.game.findMany({
      where: { id: { in: chon } },
      select: { ...CHON_THE, gioiThieu: true },
    }),
    layKe({}, [{ dangLuc: 'desc' }, { id: 'desc' }], 3),
  ]);

  // Prisma trả về theo thứ tự của nó, nên xếp lại đúng thứ tự vừa chia — bằng
  // không thì "game của hôm nay" đổi mỗi lần tải trang dù bộ bốn vẫn thế.
  const thuTu = new Map(chon.map((id, i) => [id, i]));
  const ngayNay = duocChon.sort((a, b) => (thuTu.get(a.id) ?? 0) - (thuTu.get(b.id) ?? 0));

  const [chinh, ...conLai] = ngayNay;
  const daBay = new Set(ngayNay.map((g) => g.id));

  return (
    <div className="mx-auto max-w-[680px] space-y-7">
      {/* Lời mời cài đặt chỉ đặt ở tab Hôm nay — đây là trang người ta mở
          thường xuyên nhất, mà mời cài ở mọi trang thì thành phiền. */}
      <NutCaiUngDung />

      <header className="pt-1">
        <p className="text-[13px] font-bold uppercase tracking-wide text-mo">
          {format(new Date(), "EEEE, d 'tháng' M", { locale: vi })}
        </p>
        <h1 className="tieu-de-trang">Hôm nay</h1>
      </header>

      {chinh && (
        <TamLon game={thanhThe(chinh)} nhan="GAME CỦA HÔM NAY"
          doan={chinh.gioiThieu ? catChu(chinh.gioiThieu, 220) : null} />
      )}

      {conLai.length > 0 && (
        <TheBoSuuTap
          nhan="CŨNG ĐÁNG THỬ"
          tieuDe="Ba game nữa cho hôm nay"
          phu="Mai lại là ba game khác, cho tới khi đi hết danh mục"
          game={conLai.map(thanhThe)} />
      )}

      <TheBoSuuTap
        nhan="MỚI NHẤT"
        tieuDe="Mới ra mắt"
        phu="Mới được thêm vào, chưa ai kịp chơi"
        xemThem="/game"
        game={moi.filter((g) => !daBay.has(g.id)).slice(0, 3)} />
    </div>
  );
}

/**
 * TẤM LỚN — một game chiếm trọn bề ngang.
 *
 * Dáng thẻ "App of the Day" của App Store: nhãn nhỏ chữ hoa nằm TRÊN tên
 * game, cả hai đè lên tấm màu; dưới tấm là một hàng trắng có biểu tượng thật
 * và nút cài, rồi tới đoạn giới thiệu.
 *
 * Nhãn đặt trên tên chứ không dưới: đọc "GAME CỦA HÔM NAY" trước rồi mới tới
 * cái tên thì cái tên ấy có nghĩa ngay. Ngược lại thì phải đọc xong tên, gặp
 * dòng nhãn, rồi quay lên đọc lại tên.
 *
 * Chỗ đáng lẽ là ảnh bìa thì xem `NenGame` — cửa hàng chưa có ảnh bìa thật, và
 * dựng một tấm ảnh giả là nói dối người xem về thứ họ sắp tải.
 */
function TamLon({ game, nhan, doan }: { game: TheGame; nhan: string; doan: string | null }) {
  return (
    <article className="the-noi overflow-hidden !rounded-the-lon">
      <Link href={`/game/${game.duongDan}`} className="block">
        {/*
          TẤM NGANG, KHÔNG PHẢI TẤM CAO.

          Bản trước là khung 4:3 với biểu tượng 104px thả giữa: ở khổ máy bàn
          thành hơn năm trăm điểm ảnh màu phẳng quây quanh một cái biểu tượng
          bé tí, và mắt đọc ra ngay là "ảnh chưa tải xong". App Store lấp chỗ
          ấy bằng ảnh chụp thật; cửa hàng này chưa có ảnh nào, mà dựng ảnh giả
          là nói dối người xem về thứ họ sắp tải.

          Nên bày đúng thứ có thật: biểu tượng, ở cỡ LỚN, đặt cạnh cái tên —
          dáng một tấm ảnh sản phẩm chụp trên phông. Tấm thấp lại, biểu tượng
          to lên, và khoảng trống biến mất vì không còn chỗ nào để trống.
        */}
        <div className="relative aspect-[4/3] w-full sm:aspect-[21/9]">
          <NenGame ten={game.ten} doLuoi={6} />

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center sm:flex-row sm:justify-start sm:gap-8 sm:p-10 sm:text-left">
            <BieuTuongGame ten={game.ten} icon={game.icon} co={124}
              className="shrink-0 shadow-[0_14px_34px_-8px_rgb(0_0_0/.5)]" />

            <div className="min-w-0">
              <p className="nhan-tren text-white/85">{nhan}</p>
              {/* Tên game là một TIÊU ĐỀ THẬT, không phải một span tô đậm: nó là
                  đầu đề của khối này, nên bộ đọc màn hình phải nhảy tới được. */}
              <h2 className="mt-1.5 text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-white sm:text-[32px]">
                {game.ten}
              </h2>
              {game.tenViet && (
                <p className="mt-1 text-[14px] text-white/80">{game.tenViet}</p>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Hàng dưới KHÔNG lặp lại biểu tượng — nó vừa là chủ thể của tấm ngay
          trên. Chỗ ấy nhường cho thứ chưa nói ở đâu: thể loại và điểm. */}
      <div className="flex items-center gap-3 p-4">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">
            {game.theLoai.map((t) => t.ten).join(' · ') || 'Game'}
          </span>
          <span className="phu mt-0.5 block truncate">
            {game.soLuotDanhGia > 0
              ? `${game.sao.toFixed(1).replace('.', ',')} sao · ${game.heMay.length} hệ máy`
              : `${game.heMay.length} hệ máy`}
          </span>
        </span>
        <NutCai duongDan={game.duongDan} />
      </div>

      {doan && (
        <p className="vach px-4 pb-4 pt-3.5 text-[14px] leading-relaxed text-mo">{doan}</p>
      )}
    </article>
  );
}

/**
 * THẺ BỘ SƯU TẬP — vài game gom dưới một đầu đề.
 *
 * App Store dùng dáng này cho mấy mục "5 ứng dụng để…". Ở đây nó gánh phần
 * còn lại của lượt chia trong ngày, nên đầu đề phải nói thật: đây là ba game
 * của hôm nay, mai sẽ khác.
 */
function TheBoSuuTap({ nhan, tieuDe, phu, game, xemThem }: {
  nhan: string;
  tieuDe: string;
  phu: string;
  game: TheGame[];
  xemThem?: string;
}) {
  if (game.length === 0) return null;

  const dau = (
    <>
      <p className="nhan-tren text-nhan">{nhan}</p>
      <p className="tieu-de mt-0.5">{tieuDe}</p>
      <p className="phu mt-1">{phu}</p>
    </>
  );

  /*
   * ĐẦU ĐỀ NẰM NGOÀI THẺ, chỉ danh sách nằm trong.
   *
   * Bản trước nhét cả nhãn, đầu đề và dòng phụ vào trong thẻ trắng, nên trước
   * mỗi nhóm game có ba dòng chữ trong một hộp — cuộn dọc thì cả trang thành
   * một chồng biểu mẫu giống hệt nhau. Đặt đầu đề lên nền xám thì nó thành
   * MỐC ĐỊNH VỊ: lướt nhanh vẫn bắt được mình đang ở mục nào, mà thẻ trắng
   * bên dưới chỉ còn đúng một việc là chứa danh sách.
   */
  return (
    <section>
      {xemThem ? (
        <Link href={xemThem} className="mb-3 flex items-start justify-between gap-3 px-1">
          <span className="min-w-0">{dau}</span>
          <ChevronRight size={20} className="mt-5 shrink-0 text-mo" aria-hidden />
        </Link>
      ) : (
        <div className="mb-3 px-1">{dau}</div>
      )}
      <ul className="the-noi danh-sach-the">
        {game.map((g) => (
          <li key={g.id} className="p-3.5"><HangGame game={g} /></li>
        ))}
      </ul>
    </section>
  );
}

function KhoTrong() {
  return (
    <div className="the mx-auto max-w-md p-8 text-center">
      <BieuTuongGame ten="SunnyStore" icon={null} co={64} className="mx-auto" />
      <h1 className="mt-4 text-lg font-bold">Chưa có trò chơi nào</h1>
      <p className="phu mt-1.5">
        Game đầu tiên phải do quản trị viên thêm vào rồi bấm đăng.
      </p>
      <Link href="/quan-tri/game/moi" className="nut-cai-dam mt-5">Thêm game đầu tiên</Link>
    </div>
  );
}
