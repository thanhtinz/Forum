import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Pagination } from '@/components/Pagination';
import { HANG_MUA_RONG, anhRong, tenRong } from '@/lib/rong-const';
import { cn, tinhSoTrang } from '@/lib/utils';

export const metadata: Metadata = { title: 'Xếp hạng — Đảo rồng' };
export const dynamic = 'force-dynamic';

const MOI_TRANG = 10;

/**
 * Trần số trang.
 *
 * `skip` lớn thì Postgres vẫn phải đọc qua từng ấy hàng rồi vứt đi, nên trang
 * thứ một nghìn tốn đúng bằng cả bảng. Cùng lối `TRAN_TRANG` ở bảng xếp hạng
 * Đảo Pokémon. Không ai đi tìm người hạng năm trăm cả.
 */
const TRAN_TRANG = 20;

/** Một dòng trên bảng, đã quy về cùng một hình dạng dù đọc từ bảng nào. */
interface Dong {
  khoa: string;
  ten: string;
  phu: string;
  so: number;
  /** Ảnh con rồng, chỉ bảng cấp mới có. */
  anh?: string;
  laToi: boolean;
}

/**
 * Bảng xếp hạng của Đảo Rồng — CHỖ DUY NHẤT bày xếp hạng của đảo.
 *
 * Khác cách làm ở `pokemon/xep-hang`: bên ấy năm bảng đều đọc CÙNG một model
 * nên chỉ khác nhau ở tên cột, còn ở đây ba bảng đọc `RongNguoiChoi` mà bảng
 * "rồng cấp cao nhất" lại đọc `Rong`. Nên mỗi bảng tự mang câu truy vấn của
 * nó và quy kết quả về `Dong`, thay vì dựng khoá cột động — khoá động thì
 * TypeScript đành trả về hợp của mọi kiểu hàng và từ đó không đọc được nữa.
 */
const BANG = [
  {
    ma: 'diem',
    ten: 'Điểm đấu trường mùa này',
    // Chỉ tính người đã đánh: ai chưa ra sàn vẫn mang đúng 1000 điểm khởi
    // đầu, để lẫn vào thì nửa bảng là người chưa từng đấu trận nào.
    async dem() {
      return db.rongNguoiChoi.count({ where: { OR: [{ thangDau: { gt: 0 } }, { thuaDau: { gt: 0 } }] } });
    },
    async doc(skip: number, toi: string) {
      const rows = await db.rongNguoiChoi.findMany({
        where: { OR: [{ thangDau: { gt: 0 } }, { thuaDau: { gt: 0 } }] },
        orderBy: [{ diemDau: 'desc' }, { id: 'asc' }],
        skip, take: MOI_TRANG,
        select: {
          id: true, userId: true, diemDau: true, thangDau: true, thuaDau: true,
          user: { select: { name: true, username: true } },
        },
      });
      return rows.map((r): Dong => ({
        khoa: r.id,
        ten: r.user.name ?? r.user.username ?? 'Ẩn danh',
        phu: `${r.thangDau} thắng / ${r.thuaDau} thua`,
        so: r.diemDau,
        laToi: r.userId === toi,
      }));
    },
    async hang(toi: string) {
      const ho = await db.rongNguoiChoi.findUnique({
        where: { userId: toi }, select: { diemDau: true, thangDau: true, thuaDau: true },
      });
      if (!ho || (ho.thangDau === 0 && ho.thuaDau === 0)) return null;
      return (await db.rongNguoiChoi.count({
        where: {
          diemDau: { gt: ho.diemDau },
          OR: [{ thangDau: { gt: 0 } }, { thuaDau: { gt: 0 } }],
        },
      })) + 1;
    },
  },
  {
    ma: 'thang',
    ten: 'Trận thắng mùa này',
    async dem() { return db.rongNguoiChoi.count({ where: { thangDau: { gt: 0 } } }); },
    async doc(skip: number, toi: string) {
      const rows = await db.rongNguoiChoi.findMany({
        where: { thangDau: { gt: 0 } },
        orderBy: [{ thangDau: 'desc' }, { id: 'asc' }],
        skip, take: MOI_TRANG,
        select: {
          id: true, userId: true, thangDau: true, thuaDau: true,
          user: { select: { name: true, username: true } },
        },
      });
      return rows.map((r): Dong => ({
        khoa: r.id,
        ten: r.user.name ?? r.user.username ?? 'Ẩn danh',
        phu: `${r.thuaDau} trận thua`,
        so: r.thangDau,
        laToi: r.userId === toi,
      }));
    },
    async hang(toi: string) {
      const ho = await db.rongNguoiChoi.findUnique({ where: { userId: toi }, select: { thangDau: true } });
      if (!ho || ho.thangDau === 0) return null;
      return (await db.rongNguoiChoi.count({ where: { thangDau: { gt: ho.thangDau } } })) + 1;
    },
  },
  {
    ma: 'suu-tam',
    ten: 'Sổ sưu tầm',
    async dem() { return db.rongNguoiChoi.count({ where: { daSuuTam: { gt: 0 } } }); },
    async doc(skip: number, toi: string) {
      const rows = await db.rongNguoiChoi.findMany({
        where: { daSuuTam: { gt: 0 } },
        orderBy: [{ daSuuTam: 'desc' }, { id: 'asc' }],
        skip, take: MOI_TRANG,
        select: {
          id: true, userId: true, daSuuTam: true, mocDaNhan: true,
          user: { select: { name: true, username: true } },
        },
      });
      return rows.map((r): Dong => ({
        khoa: r.id,
        ten: r.user.name ?? r.user.username ?? 'Ẩn danh',
        phu: `${r.mocDaNhan} mốc đã lĩnh`,
        so: r.daSuuTam,
        laToi: r.userId === toi,
      }));
    },
    async hang(toi: string) {
      const ho = await db.rongNguoiChoi.findUnique({ where: { userId: toi }, select: { daSuuTam: true } });
      if (!ho || ho.daSuuTam === 0) return null;
      return (await db.rongNguoiChoi.count({ where: { daSuuTam: { gt: ho.daSuuTam } } })) + 1;
    },
  },
  {
    ma: 'cap',
    ten: 'Rồng cấp cao nhất',
    // Xếp trên từng CON RỒNG chứ không trên người nuôi: nuôi một con lên cấp
    // 30 là việc của con rồng ấy, và người xem muốn thấy đúng con nào.
    async dem() { return db.rong.count({ where: { noAt: { not: null } } }); },
    async doc(skip: number, toi: string) {
      const rows = await db.rong.findMany({
        where: { noAt: { not: null } },
        orderBy: [{ cap: 'desc' }, { exp: 'desc' }, { id: 'asc' }],
        skip, take: MOI_TRANG,
        select: {
          id: true, userId: true, ten: true, loai: true, mau: true, cap: true, doi: true,
          user: { select: { name: true, username: true } },
        },
      });
      return rows.map((r): Dong => ({
        khoa: r.id,
        ten: r.ten || tenRong(r.loai, r.mau),
        phu: `đời ${r.doi} · của ${r.user.name ?? r.user.username ?? 'Ẩn danh'}`,
        so: r.cap,
        anh: anhRong(r.loai, r.mau),
        laToi: r.userId === toi,
      }));
    },
    async hang(toi: string) {
      const con = await db.rong.findFirst({
        where: { userId: toi, noAt: { not: null } },
        orderBy: { cap: 'desc' },
        select: { cap: true },
      });
      if (!con) return null;
      return (await db.rong.count({ where: { noAt: { not: null }, cap: { gt: con.cap } } })) + 1;
    },
  },
] as const;

export default async function TrangXepHangRong({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/rong/xep-hang');

  const sp = await searchParams;
  // Mã bảng bịa ra thì về bảng đầu, số trang bịa ra thì về trang 1 — không
  // báo lỗi, cũng không nổ.
  const bang = BANG.find((b) => b.ma === sp.bang) ?? BANG[0];
  const trang = Math.max(1, Number(sp.trang) || 1);
  const skip = (Math.min(trang, TRAN_TRANG) - 1) * MOI_TRANG;

  const [tong, hang, hangToi] = await Promise.all([
    bang.dem(),
    bang.doc(skip, userId),
    bang.hang(userId),
  ]);

  const soTrang = Math.min(TRAN_TRANG, tinhSoTrang(tong, MOI_TRANG));
  const trangHienTai = Math.min(trang, soTrang);
  const duong = (ma: string) => `/rong/xep-hang?bang=${ma}`;

  return (
    <>
      <h1 className="text-xl font-black">Xếp hạng Đảo rồng</h1>

      {/* Tab là LIÊN KẾT chứ không phải nút: trang này không cần mã phía trình
          duyệt, mà liên kết thì chia sẻ được và bấm quay lại vẫn đúng chỗ. */}
      <nav aria-label="Chọn bảng xếp hạng" className="flex flex-wrap gap-1.5">
        {BANG.map((b) => (
          <Link key={b.ma} href={duong(b.ma)}
            aria-current={b.ma === bang.ma ? 'page' : undefined}
            className={cn('chip !py-1 text-xs',
              b.ma === bang.ma ? 'rong-nen-nhan rong-vien font-bold' : 'hover:border-brand-300')}>
            {b.ten}
          </Link>
        ))}
      </nav>

      <section className="rong-tam p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="zib-title">{bang.ten}</h2>
          <span className="retro-sub text-ink-400">
            {hangToi != null
              ? <>Bạn đang hạng <b className="rong-nhan">{hangToi.toLocaleString('vi')}</b>/{tong.toLocaleString('vi')}</>
              : 'Bạn chưa có tên trong bảng này'}
          </span>
        </div>

        {hang.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa có ai.</p>
        ) : (
          <ol className="space-y-1.5">
            {hang.map((x, i) => (
              <li key={x.khoa} className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                x.laToi ? 'rong-nen-nhan font-bold' : 'bg-ink-50 dark:bg-ink-800/50',
              )}>
                <span className="w-7 shrink-0 text-xs font-black tabular-nums text-ink-400">
                  {(trangHienTai - 1) * MOI_TRANG + i + 1}
                </span>
                {x.anh && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={x.anh} alt="" aria-hidden className="size-8 shrink-0 object-contain"
                    style={{ imageRendering: 'pixelated' }} />
                )}
                <span className="min-w-0 flex-1 truncate">
                  <b>{x.ten}</b>
                  <span className="retro-sub ml-1.5 font-normal text-ink-400">{x.phu}</span>
                </span>
                <span className="shrink-0 tabular-nums">{x.so.toLocaleString('vi')}</span>
              </li>
            ))}
          </ol>
        )}

        <Pagination page={trangHienTai} totalPages={soTrang} pageParam="trang"
          basePath={duong(bang.ma)} />
      </section>

      <section className="rong-tam p-5 text-sm text-ink-600 dark:text-ink-300">
        <h2 className="zib-title mb-2">Thưởng cuối mùa</h2>
        <p className="retro-sub mb-2 text-ink-400">
          Mỗi tháng là một mùa. Hết mùa, điểm đấu trường về lại mốc khởi đầu và
          thưởng phát theo ĐIỂM của chính bạn — không theo thứ hạng, vì mỗi
          người chốt mùa vào một lúc khác nhau nên bảng không có thời điểm nào
          là đúng. Thưởng trả bằng điểm diễn đàn.
        </p>
        <ul className="space-y-1">
          {HANG_MUA_RONG.map((h) => (
            <li key={h.moc} className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-1.5 dark:bg-ink-800/50">
              <b className="w-28 shrink-0">{h.ten}</b>
              <span className="min-w-0 flex-1 text-ink-500 dark:text-ink-300">từ {h.moc} điểm</span>
              <span className="shrink-0 tabular-nums">{h.thuong} điểm</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
