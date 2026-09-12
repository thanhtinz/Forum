import Link from 'next/link';
import type { Metadata } from 'next';
import { MessageSquare, Search } from 'lucide-react';
import { db } from '@/lib/db';
import {
  MOI_TRANG, MOI_TRANG_THAO_LUAN, demChuDeTim, docBoLoc, duyetDanhMuc, layKe, thanhTruyVan, timChuDe,
} from '@/lib/danh-muc';
import { HangGame } from '@/components/game/HangGame';
import { LuoiTheLoai } from '@/components/game/LuoiTheLoai';
import { PhanTrang } from '@/components/PhanTrang';
import { OTim } from '@/components/vo/OTim';
import { cachDay, gonSo, gop, kep, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tìm game' };

/*
 * TRANG TÌM.
 *
 * Chưa gõ gì thì KHÔNG để trang trắng: đó là lúc người dùng đang phân vân
 * nhất. Bày ra vài lối gợi ý — thể loại đông game nhất và mấy game tải nhiều —
 * để họ có chỗ bấm thay vì phải nghĩ ra một từ khoá.
 */
export default async function TrangTim({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const loc = docBoLoc(sp);

  if (!loc.tuKhoa) return <ChuaGo />;
  // Gán ra hằng vì `loc` là object: phép thu hẹp kiểu ở dòng trên không theo
  // được vào trong mấy hàm mũi tên bên dưới.
  const tuKhoa = loc.tuKhoa;

  const xemThaoLuan = sp.loai === 'thao-luan';

  /*
   * Đếm CẢ HAI bên ngay cả khi chỉ vẽ một bên.
   *
   * Con số trên tab chính là thứ nói cho người tìm biết rằng bên kia có gì —
   * không có nó thì tab "Thảo luận" trông như một chỗ trống, và gần như không
   * ai bấm vào một chỗ trống để thử.
   */
  const [{ game, tong, trang }, soThaoLuan] = await Promise.all([
    duyetDanhMuc(loc),
    demChuDeTim(tuKhoa),
  ]);

  const duongTab = (loai: 'game' | 'thao-luan') =>
    `/tim?q=${encodeURIComponent(tuKhoa)}${loai === 'thao-luan' ? '&loai=thao-luan' : ''}`;

  return (
    <div className="space-y-5">
      <div className="lg:hidden"><OTim giaTriDau={loc.tuKhoa} /></div>

      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Kết quả cho “{tuKhoa}”</h1>
      </div>

      {/* Hai tab là <Link> sang địa chỉ riêng, không phải nút đổi trạng thái:
          dán được kết quả thảo luận cho người khác, và nút Lùi quay về đúng
          tab vừa xem. */}
      <nav className="vach flex gap-6 border-b" aria-label="Loại kết quả">
        {([['game', 'Game', tong], ['thao-luan', 'Thảo luận', soThaoLuan]] as const).map(
          ([ma, ten, so]) => {
            const chon = (ma === 'thao-luan') === xemThaoLuan;
            return (
              <Link key={ma} href={duongTab(ma)} aria-current={chon ? 'page' : undefined}
                className={gop(
                  'relative -mb-px flex items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-[14px] transition-colors',
                  chon ? 'border-nhan font-bold text-nhan' : 'border-transparent font-medium text-mo hover:text-chu',
                )}>
                {ten}
                <span className={gop('rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                  chon ? 'bg-nhan/12 text-nhan' : 'bg-nen3 text-mo')}>
                  {gonSo(so)}
                </span>
              </Link>
            );
          },
        )}
      </nav>

      {xemThaoLuan
        ? <KetQuaThaoLuan tuKhoa={tuKhoa} tong={soThaoLuan} trangNhap={sp.trang} />
        : game.length === 0 ? (
          <div className="the p-8 text-center">
            <Search size={24} className="mx-auto text-mo" />
            <p className="mt-2 text-[14px] font-semibold">Không tìm thấy game nào</p>
            <p className="phu mt-1">
              Thử gõ ngắn hơn — chỉ một từ trong tên game thường ra nhiều kết quả hơn cả câu.
            </p>
            {/* Có thảo luận khớp thì mời sang đó trước khi mời gửi yêu cầu:
                rất có thể thứ họ tìm đang nằm trong một cuộc trao đổi. */}
            {soThaoLuan > 0 ? (
              <Link href={duongTab('thao-luan')} className="nut-xam mt-4">
                Xem {gonSo(soThaoLuan)} thảo luận khớp
              </Link>
            ) : (
              <Link href="/yeu-cau" className="nut-xam mt-4">Gửi yêu cầu</Link>
            )}
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {game.map((g) => <li key={g.id}><HangGame game={g} /></li>)}
            </ul>
            <PhanTrang trang={trang} tongTrang={soTrang(tong, MOI_TRANG)}
              dungDuong={(t) => `/tim${thanhTruyVan(loc, { trang: t })}`} />
          </>
        )}
    </div>
  );
}

/** Danh sách chủ đề diễn đàn khớp từ khoá. */
async function KetQuaThaoLuan({ tuKhoa, tong, trangNhap }: {
  tuKhoa: string;
  tong: number;
  trangNhap: string | string[] | undefined;
}) {
  const tongTrang = soTrang(tong, MOI_TRANG_THAO_LUAN);
  const trang = kep(Array.isArray(trangNhap) ? trangNhap[0] : trangNhap, 1, tongTrang, 1);
  const chuDe = await timChuDe(tuKhoa, trang);

  if (tong === 0) {
    return (
      <div className="the p-8 text-center">
        <MessageSquare size={24} className="mx-auto text-mo" aria-hidden />
        <p className="mt-2 text-[14px] font-semibold">Chưa ai bàn về chuyện này</p>
        <p className="phu mt-1">
          Mở một chủ đề ở khu diễn đàn của game bạn đang chơi — người gặp sau sẽ tìm thấy nó.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul aria-label="Thảo luận khớp" className="the divide-y divide-vien">
        {chuDe.map((c) => (
          <li key={c.id}>
            <Link href={`/game/${c.game.duongDan}/dien-dan/${c.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-nen3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{c.tieuDe}</span>
                {/* Tên game đứng đầu dòng phụ: kết quả tìm gom chủ đề của mọi
                    game lại, nên không nói rõ thì chẳng biết đang đọc về game nào. */}
                <span className="phu mt-0.5 block truncate">
                  {c.game.ten} · {c.nguoi.tenHienThi} · {cachDay(c.traLoiCuoiLuc)}
                </span>
              </span>
              <span className="phu flex shrink-0 items-center gap-1">
                <MessageSquare size={12} aria-hidden /> {c.soTraLoi}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <PhanTrang trang={trang} tongTrang={tongTrang}
        dungDuong={(t) => `/tim?q=${encodeURIComponent(tuKhoa)}&loai=thao-luan${t > 1 ? `&trang=${t}` : ''}`} />
    </>
  );
}

async function ChuaGo() {
  const [theLoai, goiY] = await Promise.all([
    db.theLoai.findMany({ orderBy: [{ thuTu: 'asc' }], take: 12, select: { ten: true, duongDan: true } }),
    layKe({}, [{ soLuotTai: 'desc' }, { id: 'desc' }], 4),
  ]);

  return (
    <div className="space-y-7">
      <div className="lg:hidden"><OTim /></div>

      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Tìm game</h1>
        <p className="phu mt-0.5">Gõ tên game, tên nhà phát triển, hoặc chọn một lối dưới đây.</p>
      </div>

      {/*
        GỢI Ý LÀ HÀNG GAME ĐẦY ĐỦ, KHÔNG PHẢI DANH SÁCH TỪ KHOÁ.

        Bản trước bày mấy cái tên kèm hình kính lúp, tức là gợi ý một CHỮ ĐỂ
        GÕ. Nhưng người mở trang tìm mà chưa gõ gì thì thứ họ thiếu là một
        game, không phải một từ khoá — nên mỗi dòng ở đây là game thật, có
        biểu tượng, có điểm sao, và có nút cài ngay bên phải để bấm phát ăn
        ngay. Đúng mục "Suggested" của App Store.
      */}
      {goiY.length > 0 && (
        <section>
          <h2 className="tieu-de mb-3">Gợi ý cho bạn</h2>
          <ul className="the-noi danh-sach-the">
            {goiY.map((g) => (
              <li key={g.id} className="p-3.5"><HangGame game={g} /></li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="tieu-de mb-3">Duyệt theo thể loại</h2>
        <LuoiTheLoai muc={theLoai} />
      </section>
    </div>
  );
}
