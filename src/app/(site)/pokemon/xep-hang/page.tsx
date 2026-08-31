import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Pagination } from '@/components/Pagination';
import { cn, tinhSoTrang } from '@/lib/utils';

export const metadata: Metadata = { title: 'Xếp hạng — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

const MOI_TRANG = 10;

/**
 * Trần số trang.
 *
 * `skip` lớn thì Postgres vẫn phải đọc qua từng ấy hàng rồi vứt đi, nên trang
 * thứ một nghìn tốn đúng bằng cả bảng. Cắt ở đây cho câu truy vấn luôn có trần
 * thật — cùng lối `NEW_MAX_PAGES` ở `src/lib/new-threads.ts`. Không ai đi tìm
 * người hạng năm trăm cả.
 */
const TRAN_TRANG = 20;

/**
 * Bảng xếp hạng của Đảo Pokémon — CHỖ DUY NHẤT bày xếp hạng của đảo.
 *
 * Bản gốc (`modules/ratings`) có đúng ba bảng — kinh nghiệm, trận thắng đấu
 * trường, vàng. Giữ nguyên ba bảng ấy, thêm bảng diệt quái ở Lãnh Thổ (bản gốc
 * để lẫn trong trang Lãnh Thổ) và bảng điểm đấu trường theo mùa.
 *
 * TRƯỚC ĐÂY BÀY Ở BA NƠI: trang này năm bảng, trang Đấu trường chép lại bảng
 * điểm mùa, trang Lãnh Thổ chép lại bảng diệt quái. Cùng một bảng dữ liệu,
 * cùng `take: 10`, cùng cách dựng dòng — mà ba bản còn lệch vặt nhau. Nay gom
 * hết về đây; hai trang kia chỉ giữ chỉ số của riêng người chơi.
 *
 * KHÔNG dùng chung với bảng xếp hạng của diễn đàn: điểm diễn đàn và vàng
 * trong game là hai thứ khác hẳn nhau, trộn vào là người đọc hiểu nhầm ngay.
 */
const BANG = [
  {
    ma: 'diem', ten: 'Điểm đấu trường mùa này', cot: 'diemDau',
    // Chỉ tính người đã đánh: ai chưa ra sàn vẫn mang đúng 1000 điểm khởi đầu,
    // để lẫn vào thì nửa bảng là người chưa từng đấu trận nào.
    chiKhiCo: 'thangDau',
  },
  { ma: 'exp', ten: 'Kinh nghiệm', cot: 'exp', chiKhiCo: null },
  { ma: 'thang', ten: 'Thắng đấu trường', cot: 'thangDau', chiKhiCo: 'thangDau' },
  { ma: 'vang', ten: 'Vàng', cot: 'vang', chiKhiCo: null },
  { ma: 'diet', ten: 'Diệt quái ở Lãnh Thổ', cot: 'soDiet', chiKhiCo: 'soDiet' },
] as const;

type Bang = (typeof BANG)[number];
type CotSo = Bang['cot'];

/**
 * Chọn ĐỦ năm cột số thay vì chỉ cột đang xếp.
 *
 * `select: { [bang.cot]: true }` dựng khoá động nên TypeScript đành trả về hợp
 * của mọi kiểu hàng, và từ đó không đọc được `x[bang.cot]` nữa. Năm cột này
 * đều là số nguyên nằm sẵn trên cùng một hàng, lấy cả năm không tốn thêm gì.
 */
const CHON = {
  id: true, ten: true, cap: true,
  exp: true, vang: true, thangDau: true, soDiet: true, diemDau: true,
} as const;

/** Điều kiện lọc của một bảng; rỗng nghĩa là tính cả đảo. */
function locCua(b: Bang): Prisma.PokeNhanVatWhereInput {
  return b.chiKhiCo ? { [b.chiKhiCo]: { gt: 0 } } : {};
}

export default async function TrangXepHang({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/xep-hang');

  const toi = await db.pokeNhanVat.findUnique({
    where: { userId },
    select: { id: true, exp: true, vang: true, thangDau: true, soDiet: true, diemDau: true },
  });
  if (!toi) redirect('/pokemon');

  const sp = await searchParams;
  // Mã bảng bịa ra thì về bảng đầu, số trang bịa ra thì về trang 1 — không báo
  // lỗi, cũng không nổ.
  const bang = BANG.find((b) => b.ma === sp.bang) ?? BANG[0];
  const trang = Math.max(1, Number(sp.trang) || 1);

  const loc = locCua(bang);
  const [tong, hang] = await Promise.all([
    db.pokeNhanVat.count({ where: loc }),
    db.pokeNhanVat.findMany({
      where: loc,
      // Chốt thêm `id` làm khoá phụ: hai người bằng điểm mà không có khoá phụ
      // thì thứ tự giữa hai lần đọc có thể đảo, và phân trang sẽ nhảy dòng.
      orderBy: [{ [bang.cot]: 'desc' } as Prisma.PokeNhanVatOrderByWithRelationInput, { id: 'asc' }],
      skip: (Math.min(trang, TRAN_TRANG) - 1) * MOI_TRANG,
      take: MOI_TRANG,
      select: CHON,
    }),
  ]);

  const soTrang = Math.min(TRAN_TRANG, tinhSoTrang(tong, MOI_TRANG));
  const trangHienTai = Math.min(trang, soTrang);

  // Hạng của chính mình: đếm số người đứng trên. Phân trang rồi thì người hạng
  // bốn mươi bảy phải lật năm trang mới thấy mình — nên nói thẳng ra ở đây.
  const cuaToi = toi[bang.cot];
  const hangToi = bang.chiKhiCo && toi[bang.chiKhiCo] <= 0
    ? null
    : (await db.pokeNhanVat.count({
      where: { ...loc, [bang.cot]: { gt: cuaToi } },
    })) + 1;

  const duong = (ma: string) => `/pokemon/xep-hang?bang=${ma}`;

  return (
    <div className="space-y-4">
      <Link href="/pokemon" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Đảo Pokémon
      </Link>
      <h1 className="text-xl font-black">Xếp hạng Đảo Pokémon</h1>

      {/* Tab là LIÊN KẾT chứ không phải nút: trang này không cần mã phía trình
          duyệt, mà liên kết thì chia sẻ được và bấm quay lại vẫn đúng chỗ. */}
      <nav aria-label="Chọn bảng xếp hạng" className="flex flex-wrap gap-1.5">
        {BANG.map((b) => (
          <Link key={b.ma} href={duong(b.ma)}
            aria-current={b.ma === bang.ma ? 'page' : undefined}
            className={cn(
              'chip !py-1 text-xs',
              b.ma === bang.ma
                ? 'border-brand-400 bg-brand-50 font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                : 'hover:border-brand-300',
            )}>
            {b.ten}
          </Link>
        ))}
      </nav>

      <section className="dao-tam p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="zib-title">{bang.ten}</h2>
          <span className="retro-sub text-ink-400">
            {hangToi != null
              ? <>Bạn đang hạng <b className="text-brand-600">{hangToi.toLocaleString('vi')}</b>/{tong.toLocaleString('vi')}</>
              : 'Bạn chưa có tên trong bảng này'}
          </span>
        </div>

        {hang.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa có ai.</p>
        ) : (
          <ol className="space-y-1.5">
            {hang.map((x, i) => {
              const thu = (trangHienTai - 1) * MOI_TRANG + i + 1;
              return (
                <li key={x.id} className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                  x.id === toi.id ? 'bg-brand-50 font-bold dark:bg-brand-950/40' : 'bg-ink-50 dark:bg-ink-800/50',
                )}>
                  <span className="w-7 shrink-0 text-xs font-black tabular-nums text-ink-400">{thu}</span>
                  <b className="min-w-0 flex-1 truncate">{x.ten}</b>
                  <span className="shrink-0 text-xs text-ink-400">cấp {x.cap}</span>
                  <span className="shrink-0 tabular-nums">
                    {x[bang.cot as CotSo].toLocaleString('vi')}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <Pagination page={trangHienTai} totalPages={soTrang} pageParam="trang"
          basePath={duong(bang.ma)} />
      </section>
    </div>
  );
}
