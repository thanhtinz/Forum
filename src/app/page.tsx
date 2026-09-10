import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN, layKe } from '@/lib/kho-game';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { HangGame } from '@/components/game/HangGame';
import { NutCai } from '@/components/game/NutCai';
import { mauCuaGame } from '@/lib/mau-game';
import { catChu } from '@/lib/tien-ich';
import type { TheGame } from '@/components/game/the-game';

export const dynamic = 'force-dynamic';

/*
 * TAB "HÔM NAY".
 *
 * Chép ý của tab Today ở App Store: không phải một cái kho bày ra để lọc, mà
 * một trang có người biên tập — mỗi ngày vài game, mỗi game một tấm to, có
 * dòng nhãn nói VÌ SAO nó nằm ở đây.
 *
 * Khác chỗ này: dòng hook lấy từ chính phần giới thiệu của game, không phải
 * một câu quảng cáo viết thêm. Kho này chưa có ban biên tập, mà bịa ra một
 * giọng biên tập thì thành nói thay người không tồn tại.
 *
 * Tab "Game" mới là chỗ bày kho: kệ, bảng xếp hạng, thể loại.
 */

const NHAN: Record<string, string> = {
  chon: 'BAN QUẢN KHO CHỌN',
  moi: 'VỪA LÊN KHO',
  viet: 'CÓ BẢN VIỆT HOÁ',
};

export default async function HomNay() {
  const [noiBat, hook, moi, vietHoa, tongGame] = await Promise.all([
    layKe({ noiBat: true }, [{ dangLuc: 'desc' }, { id: 'desc' }], 3),
    /*
     * Câu mở đầu phần giới thiệu của mấy game nổi bật.
     *
     * Tấm lớn đã in tên game to đùng trên nền màu; in lại đúng cái tên ấy ở
     * hàng ngay dưới là bắt người đọc đọc hai lần một thứ. Thay bằng câu đầu
     * của phần giới thiệu — do chính người nhập game viết, không phải một câu
     * quảng cáo bịa thêm.
     */
    db.game.findMany({
      where: { ...DANG_HIEN, noiBat: true },
      orderBy: [{ dangLuc: 'desc' }, { id: 'desc' }],
      take: 3,
      select: { id: true, gioiThieu: true },
    }),
    layKe({}, [{ dangLuc: 'desc' }, { id: 'desc' }], 4),
    layKe({ vietHoa: true }, [{ dangLuc: 'desc' }, { id: 'desc' }], 4),
    db.game.count({ where: DANG_HIEN }),
  ]);

  if (tongGame === 0) {
    return (
      <div className="the mx-auto max-w-md p-8 text-center">
        <BieuTuongGame ten="SunnyStore" icon={null} co={64} className="mx-auto" />
        <h1 className="mt-4 text-lg font-bold">Kho chưa có game nào</h1>
        <p className="phu mt-1.5">
          Game đầu tiên phải do quản trị viên thêm vào rồi bấm đăng.
        </p>
        <Link href="/quan-tri/game/moi" className="nut-cai-dam mt-5">Thêm game đầu tiên</Link>
      </div>
    );
  }

  // Game đã lên tấm to thì không lặp lại ở mấy khối dưới.
  const daBay = new Set(noiBat.map((g) => g.id));
  const moiKhac = moi.filter((g) => !daBay.has(g.id)).slice(0, 3);
  moiKhac.forEach((g) => daBay.add(g.id));
  const vietKhac = vietHoa.filter((g) => !daBay.has(g.id)).slice(0, 3);

  return (
    <div className="mx-auto max-w-[680px] space-y-6">
      <header>
        <p className="text-[13px] font-bold uppercase tracking-wide text-mo">
          {format(new Date(), "EEEE, d 'tháng' M", { locale: vi })}
        </p>
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">Hôm nay</h1>
      </header>

      {noiBat.map((g) => (
        <TamLon key={g.id} game={g} nhan={NHAN.chon}
          hook={cauDau(hook.find((h) => h.id === g.id)?.gioiThieu)} />
      ))}

      {moiKhac.length > 0 && (
        <KhoiDanhSach tieuDe="Vừa lên kho" phu="Mới được thêm vào tuần này"
          xemThem="/game" game={moiKhac} />
      )}

      {vietKhac.length > 0 && (
        <KhoiDanhSach tieuDe="Chơi bằng tiếng Việt" phu="Không phải đoán chữ"
          xemThem="/duyet?viet-hoa=1" game={vietKhac} />
      )}
    </div>
  );
}

/** Câu đầu tiên của một đoạn văn, cắt ở dấu chấm. Rỗng thì trả `null`. */
function cauDau(doan: string | null | undefined): string | null {
  const chu = (doan ?? '').trim();
  if (!chu) return null;
  const het = chu.indexOf('. ');
  return het > 0 ? `${chu.slice(0, het)}.` : catChu(chu, 120);
}

/**
 * TẤM LỚN — một game chiếm trọn bề ngang.
 *
 * Tỉ lệ 3:2 cố định. Để chiều cao tự do thì mỗi tấm một chiều cao, và trang
 * cuộn xuống thành một dãy hộp so le trông như bị vỡ.
 *
 * Nền là dải màu suy từ tên game chứ không phải ảnh: kho chưa có ảnh bìa
 * thật, mà dựng một tấm ảnh giả là nói dối người xem về thứ họ sắp tải.
 */
function TamLon({ game, nhan, hook }: { game: TheGame; nhan: string; hook: string | null }) {
  const { tu, den } = mauCuaGame(game.ten);

  return (
    <article className="the overflow-hidden">
      <Link href={`/game/${game.duongDan}`} className="block">
        <div className="relative aspect-[3/2] w-full"
          style={{ backgroundImage: `linear-gradient(140deg, ${tu}, ${den})` }}>
          <span aria-hidden
            className="absolute -right-6 -top-10 select-none font-black leading-none text-white/15"
            style={{ fontSize: 'clamp(160px, 42vw, 300px)' }}>
            {game.ten.slice(0, 2).toUpperCase()}
          </span>
          <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 p-5">
            <span className="block text-[11px] font-bold tracking-widest text-white/80">{nhan}</span>
            <span className="mt-1 block text-[26px] font-bold leading-tight text-white">{game.ten}</span>
          </span>
        </div>
      </Link>

      {/* Hàng dưới tấm: biểu tượng thật, câu mở đầu của phần giới thiệu, nút
          cài. Không có nó thì tấm băng chỉ để ngắm chứ không dẫn tới đâu. */}
      <div className="flex items-center gap-3 p-4">
        <BieuTuongGame ten={game.ten} icon={game.icon} co={52} />
        <span className="min-w-0 flex-1">
          {/* KHÔNG in lại tên game: nó đã nằm to đùng ngay trên tấm màu. */}
          <span className="block dong-2 text-[13px] leading-snug">
            {hook ?? (game.theLoai.map((t) => t.ten).join(' · ') || 'Game')}
          </span>
        </span>
        <NutCai duongDan={game.duongDan} />
      </div>
    </article>
  );
}

function KhoiDanhSach({ tieuDe, phu, xemThem, game }: {
  tieuDe: string; phu: string; xemThem: string; game: TheGame[];
}) {
  return (
    <section className="the p-4">
      <Link href={xemThem} className="mb-3 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="tieu-de block truncate">{tieuDe}</span>
          <span className="phu mt-0.5 block truncate">{phu}</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-mo" aria-hidden />
      </Link>
      <ul className="space-y-3.5">
        {game.map((g) => <li key={g.id}><HangGame game={g} /></li>)}
      </ul>
    </section>
  );
}
