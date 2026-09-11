import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowDown, ArrowUp, Plus, Search } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { PhanTrang } from '@/components/PhanTrang';
import { ODanhDau, ODanhDauHet, ThanhViecChon, VungChon } from '@/components/quan-tri/ChonNhieu';
import { cachDay, gonSo, gop } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quản lý game' };

const NHAN: Record<string, { ten: string; lop: string }> = {
  NHAP: { ten: 'Nháp', lop: 'bg-nen3 text-mo' },
  DANG_HIEN: { ten: 'Đang hiện', lop: 'bg-nhan/12 text-nhan' },
  DA_GO: { ten: 'Đã gỡ', lop: 'bg-xau/10 text-xau' },
};

const LOC = [
  { ma: '', ten: 'Tất cả' },
  { ma: 'DANG_HIEN', ten: 'Đang hiện' },
  { ma: 'NHAP', ten: 'Nháp' },
  { ma: 'DA_GO', ten: 'Đã gỡ' },
];

/*
 * Cột sắp xếp được, khai báo CỐ ĐỊNH ở đây.
 *
 * Không nhận thẳng tên cột từ địa chỉ rồi ném vào `orderBy`: làm thế là để
 * người ngoài tự chọn cột sắp xếp, mà cột lạ thì Prisma ném lỗi và cả trang
 * quản trị trắng bóc. Tra qua bảng này thì tham số rác chỉ rơi về mặc định.
 */
const COT = {
  sua: { ten: 'Sửa lần cuối', sapTheo: { suaLuc: 'desc' } as Prisma.GameOrderByWithRelationInput },
  ten: { ten: 'Tên', sapTheo: { ten: 'asc' } as Prisma.GameOrderByWithRelationInput },
  tai: { ten: 'Lượt tải', sapTheo: { soLuotTai: 'desc' } as Prisma.GameOrderByWithRelationInput },
  danhGia: { ten: 'Đánh giá', sapTheo: { soLuotDanhGia: 'desc' } as Prisma.GameOrderByWithRelationInput },
} as const;

type MaCot = keyof typeof COT;
const MOI_TRANG = 20;

export default async function DanhSachGame({ searchParams }: {
  searchParams: Promise<{ tim?: string; trangThai?: string; sap?: string; trang?: string }>;
}) {
  const sp = await searchParams;

  const tim = (sp.tim ?? '').trim().slice(0, 80);
  const trangThai = LOC.some((l) => l.ma === sp.trangThai) ? (sp.trangThai ?? '') : '';
  const sap: MaCot = sp.sap && sp.sap in COT ? (sp.sap as MaCot) : 'sua';
  const trang = Math.max(1, Number(sp.trang) || 1);

  const dieuKien: Prisma.GameWhereInput = {
    ...(trangThai ? { trangThai: trangThai as 'NHAP' } : {}),
    // Tìm cả tên tiếng Việt và tên hãng: người quản kho nhớ "mấy game của
    // Gameloft" chứ không nhớ từng cái tên một.
    ...(tim
      ? {
          OR: [
            { ten: { contains: tim, mode: 'insensitive' } },
            { tenViet: { contains: tim, mode: 'insensitive' } },
            { nhaPhatTrien: { contains: tim, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [tong, game] = await Promise.all([
    db.game.count({ where: dieuKien }),
    db.game.findMany({
      where: dieuKien,
      // Khoá phụ `id` để hai game cùng giá trị ở cột chính không đổi chỗ nhau
      // giữa các trang — thiếu nó là có game hiện hai lần, có game biến mất.
      orderBy: [COT[sap].sapTheo, { id: 'desc' }],
      skip: (trang - 1) * MOI_TRANG,
      take: MOI_TRANG,
      select: {
        id: true, ten: true, tenViet: true, nhaPhatTrien: true, icon: true,
        trangThai: true, soLuotTai: true, soLuotDanhGia: true, suaLuc: true,
        _count: { select: { banTai: true, anhChup: true } },
      },
    }),
  ]);

  const tongTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));

  /** Dựng địa chỉ giữ nguyên mọi bộ lọc đang bật, chỉ đổi đúng thứ cần đổi. */
  const duong = (doi: Partial<{ tim: string; trangThai: string; sap: string; trang: number }>) => {
    const t = new URLSearchParams();
    const gop2 = { tim, trangThai, sap, trang, ...doi };
    if (gop2.tim) t.set('tim', gop2.tim);
    if (gop2.trangThai) t.set('trangThai', gop2.trangThai);
    if (gop2.sap !== 'sua') t.set('sap', gop2.sap);
    if (gop2.trang > 1) t.set('trang', String(gop2.trang));
    const chu = t.toString();
    return chu ? `/quan-tri/game?${chu}` : '/quan-tri/game';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="tieu-de-trang">Game</h1>
          <p className="phu mt-1">{gonSo(tong)} game khớp bộ lọc</p>
        </div>
        <Link href="/quan-tri/game/moi" className="nut-cai-dam !min-h-[38px] !px-4 !text-[13px]">
          <Plus size={15} aria-hidden /> Thêm game
        </Link>
      </div>

      {/*
        Ô tìm là một biểu mẫu GET thật, không phải ô nghe từng phím.
        Gõ tới đâu gọi máy chủ tới đó thì mỗi chữ cái là một lượt truy vấn cả
        bảng; mà người quản kho gõ xong tên rồi mới bấm Enter, không ai vừa gõ
        vừa đọc kết quả nhảy. Là biểu mẫu GET thì địa chỉ cũng dán được cho
        người khác, và nút lùi của trình duyệt chạy đúng.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <form action="/quan-tri/game" className="relative min-w-[220px] flex-1">
          <Search size={15} aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mo" />
          <input name="tim" defaultValue={tim} placeholder="Tìm theo tên game hoặc hãng"
            aria-label="Tìm game" className="o-nhap !pl-9" />
          {trangThai && <input type="hidden" name="trangThai" value={trangThai} />}
          {sap !== 'sua' && <input type="hidden" name="sap" value={sap} />}
        </form>

        <div className="ke gap-1.5">
          {LOC.map((l) => (
            <Link key={l.ma} href={duong({ trangThai: l.ma, trang: 1 })}
              className={gop('chip', l.ma === trangThai && 'chip-chon')}>
              {l.ten}
            </Link>
          ))}
        </div>
      </div>

      {game.length === 0 ? (
        <p className="the p-10 text-center text-[13px] text-mo">
          {tim || trangThai ? 'Không có game nào khớp bộ lọc.' : 'Chưa có trò chơi nào.'}
        </p>
      ) : (
        <VungChon>
          {/*
            BẢNG THẬT trên máy bàn, DANH SÁCH THẺ trên điện thoại.

            Bảng sáu cột nhồi vào màn hình 390px thì chữ nhỏ tới mức không đọc
            nổi, hoặc phải cuộn ngang cả bảng — mà cuộn ngang một bảng là thao
            tác không ai làm đúng ngay lần đầu. Nên khổ nhỏ đổi hẳn sang thẻ,
            chứ không co bảng lại.
          */}
          <div className="the hidden overflow-hidden lg:block">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="vach-duoi bg-nen3/60 text-left text-[12px] text-mo">
                  <th scope="col" className="w-9 pl-3">
                    <ODanhDauHet id={game.map((g) => g.id)} />
                  </th>
                  <ThSap ma="ten" dangSap={sap} duong={duong}>Game</ThSap>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Trạng thái</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Bản tải</th>
                  <ThSap ma="tai" dangSap={sap} duong={duong} phai>Lượt tải</ThSap>
                  <ThSap ma="danhGia" dangSap={sap} duong={duong} phai>Đánh giá</ThSap>
                  <ThSap ma="sua" dangSap={sap} duong={duong} phai>Sửa lần cuối</ThSap>
                </tr>
              </thead>
              <tbody className="divide-y divide-vien">
                {game.map((g) => {
                  const n = NHAN[g.trangThai] ?? NHAN.NHAP;
                  return (
                    /*
                      Cả hàng bấm được, nhưng vẫn chỉ có ĐÚNG MỘT liên kết thật.

                      Hàng sáng lên khi rê chuột mà chỉ mỗi ô tên bấm được thì
                      lời hứa của cái nền sáng ấy là lời hứa suông. Cách chữa
                      là nới vùng bấm của chính liên kết ấy ra cả hàng bằng một
                      lớp phủ trong suốt (`after:inset-0`) — chứ không phải gắn
                      `onClick` lên `<tr>`, vì hàng không phải liên kết thì
                      bàn phím không Tab tới được và chuột giữa không mở tab mới.
                    */
                    <tr key={g.id} className="relative transition-colors hover:bg-nen3/60">
                      {/* Ô tích đứng NGOÀI lớp phủ bấm-cả-hàng: `relative` ở
                          đây nâng nó lên trên lớp ấy, không thì tích vào một
                          hàng lại nhảy sang trang sửa game. */}
                      <td className="relative pl-3">
                        <ODanhDau id={g.id} ten={g.ten} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/quan-tri/game/${g.id}`}
                          className="flex items-center gap-2.5 after:absolute after:inset-0 after:content-['']">
                          <BieuTuongGame ten={g.ten} icon={g.icon} co={32} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{g.ten}</span>
                            <span className="phu block truncate">{g.nhaPhatTrien ?? '—'}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={gop('rounded-full px-2 py-0.5 text-[11px] font-bold', n.lop)}>
                          {n.ten}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-mo">
                        {g._count.banTai} bản
                        {/* Ảnh chụp là thứ thiếu nhiều nhất và khó thấy nhất,
                            nên nói thẳng ra ở đây chứ không bắt mở từng game. */}
                        {g._count.anhChup === 0 && (
                          <span className="ml-1.5 text-[11px] font-semibold text-canh">chưa có ảnh</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{gonSo(g.soLuotTai)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{g.soLuotDanhGia}</td>
                      <td className="px-3 py-2.5 text-right text-mo">{cachDay(g.suaLuc)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="the divide-y divide-vien lg:hidden">
            {game.map((g) => {
              const n = NHAN[g.trangThai] ?? NHAN.NHAP;
              return (
                <li key={g.id} className="flex items-center gap-3 pl-4">
                  <ODanhDau id={g.id} ten={g.ten} />
                  <Link href={`/quan-tri/game/${g.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-4 transition-colors hover:bg-nen3">
                    <BieuTuongGame ten={g.ten} icon={g.icon} co={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{g.ten}</span>
                      <span className="phu block truncate">
                        {g._count.banTai} bản · {gonSo(g.soLuotTai)} lượt tải · {g.soLuotDanhGia} đánh giá
                      </span>
                    </span>
                    <span className={gop('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', n.lop)}>
                      {n.ten}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <PhanTrang trang={trang} tongTrang={tongTrang} dungDuong={(t) => duong({ trang: t })} />
          <ThanhViecChon />
        </VungChon>
      )}
    </div>
  );
}

/** Ô đầu cột bấm được để đổi cách sắp. Cột đang sắp thì hiện mũi tên. */
function ThSap({ ma, dangSap, duong, phai, children }: {
  ma: MaCot;
  dangSap: MaCot;
  duong: (doi: { sap: string; trang: number }) => string;
  phai?: boolean;
  children: React.ReactNode;
}) {
  const dang = ma === dangSap;
  // Mũi tên phải chỉ ĐÚNG CHIỀU dữ liệu đang chạy: tên xếp A→Z là tăng dần
  // nên mũi lên; mấy cột số và ngày xếp từ lớn tới bé nên mũi xuống. Chỉ sai
  // chiều thôi là người đọc bảng tin nhầm thứ tự mình đang nhìn.
  const Mui = ma === 'ten' ? ArrowUp : ArrowDown;

  return (
    <th scope="col" className={gop('px-3 py-2.5 font-semibold', phai && 'text-right')}>
      <Link href={duong({ sap: ma, trang: 1 })}
        aria-sort={dang ? 'other' : 'none'}
        className={gop(
          'inline-flex items-center gap-1 hover:text-chu',
          dang && 'font-bold text-chu',
          phai && 'flex-row-reverse',
        )}>
        {children}
        {dang && <Mui size={12} aria-hidden />}
      </Link>
    </th>
  );
}
