import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { ArrowLeft, Check, CircleHelp, X } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { UserName } from '@/components/user/Cosmetic';
import { QuizCauHoi } from '@/components/giaitri/QuizCauHoi';
import { QuizBinhLuan } from '@/components/giaitri/QuizBinhLuan';
import {
  QUIZ_BINH_LUAN_MOI_TRANG, QUIZ_NHAN, binhLuanCuaCau, cauHoiChiTiet, nguoiDaTraLoi, rutGon,
} from '@/lib/quiz';
import { cn, tinhSoTrang } from '@/lib/utils';
import type { AuthorChip } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cau = await cauHoiChiTiet(id, null);
  return { title: cau ? rutGon(cau.content, 60) : 'Câu hỏi trắc nghiệm' };
}

/**
 * Trang trả lời MỘT câu hỏi — tương ứng `quiz.php?quiz=<id>` của bản gốc.
 *
 * Ba trạng thái, đúng như bản gốc:
 *  • chưa trả lời  → bốn phương án và nút gửi, KHÔNG có đáp án ở đâu cả;
 *  • đã trả lời    → kết quả cũ, đáp án đúng và lời giải, không trả lời lại;
 *  • câu của mình  → xem đáp án, không trả lời được.
 *
 * Đáp án lấy ở một truy vấn RIÊNG chỉ chạy cho ba trường hợp được thấy nó
 * (xem `cauHoiChiTiet`), nên với người chưa trả lời thì nó chưa từng rời khỏi
 * cơ sở dữ liệu — chứ không phải lấy về rồi giấu bằng giao diện.
 */
export default async function CauHoiPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ trang?: string }>;
}) {
  const { id } = await params;
  const { trang: trangRaw } = await searchParams;
  const trang = Math.max(1, parseInt(trangRaw ?? '1', 10) || 1);

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const dieuHanh = role === 'ADMIN' || role === 'MODERATOR';

  const cau = await cauHoiChiTiet(id, userId, dieuHanh);
  if (!cau) notFound();

  const laTacGia = cau.authorId === userId;
  const [nguoi, binhLuan] = await Promise.all([
    cau.soLuot > 0 ? nguoiDaTraLoi(cau.id) : Promise.resolve({ dung: [], sai: [] }),
    binhLuanCuaCau(cau.id, { trang, xemDuocPhanAn: dieuHanh }),
  ]);
  const soTrangBinhLuan = tinhSoTrang(binhLuan.tong, QUIZ_BINH_LUAN_MOI_TRANG);
  const goc = `/giai-tri/trac-nghiem/cau-hoi/${cau.id}`;

  const duocBinhLuan = Boolean(userId) && (laTacGia || dieuHanh || cau.luot !== null);
  const vuongBinhLuan = !userId
    ? 'Đăng nhập rồi trả lời câu hỏi thì mới bình luận được.'
    : 'Trả lời câu hỏi xong rồi hãy bình luận nhé.';

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri/trac-nghiem" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Trắc nghiệm
      </Link>

      {/* ── Câu hỏi ── */}
      <section className="card p-5">
        <h1 className="flex items-start gap-2 text-lg font-bold text-ink-900 dark:text-white">
          <CircleHelp size={20} className="mt-0.5 shrink-0 text-violet-500" />
          <span className="min-w-0 whitespace-pre-wrap">{cau.content}</span>
        </h1>

        <dl className="mt-3 space-y-0.5 text-xs text-ink-500">
          <div>Cọc: <b className="text-ink-700 dark:text-ink-200">{cau.price} điểm</b></div>
          <div>Lúc: {format(cau.createdAt, 'HH:mm dd/MM/yyyy')}</div>
          {cau.category && (
            <div>
              Thể loại:{' '}
              <Link href={`/giai-tri/trac-nghiem/the-loai/${cau.category.slug}`}
                className="font-semibold text-brand-600 hover:underline">
                {cau.category.name}
              </Link>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1">
            Người đăng: {cau.author ? <Chip chip={cau.author} /> : 'Ẩn danh'}
          </div>
          {cau.reviewedBy && (
            <div className="flex flex-wrap items-center gap-1">
              Người duyệt: <Chip chip={cau.reviewedBy} />
            </div>
          )}
        </dl>

        <div className="mt-4">
          {cau.luot === null && !laTacGia && userId && (
            <QuizCauHoi id={cau.id} phuongAn={cau.options} />
          )}

          {(cau.luot !== null || laTacGia || !userId) && (
            <PhuongAn options={cau.options} dapAn={cau.loGiai?.correct} daChon={cau.luot?.chosen} />
          )}

          {cau.luot !== null && (
            <p className={cn(
              'mt-3 rounded-xl p-3 text-sm font-semibold',
              cau.luot.correct
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
            )}>
              Bạn đã trả lời {cau.luot.correct ? 'đúng' : 'sai'} câu hỏi này rồi.
            </p>
          )}

          {laTacGia && (
            <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-500 dark:bg-ink-800/50">
              Câu này của bạn nên không trả lời được — bạn đang thấy sẵn đáp án.
            </p>
          )}

          {!userId && (
            <p className="mt-3 text-sm text-ink-500">
              <Link href={`/login?callbackUrl=${goc}`} className="font-semibold text-brand-600 hover:underline">
                Đăng nhập
              </Link>{' '}để trả lời câu hỏi này.
            </p>
          )}

          {cau.loGiai?.explain && (
            <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
              <b>Giải thích:</b> {cau.loGiai.explain}
            </p>
          )}
        </div>
      </section>

      {/* ── Ai đã trả lời ── */}
      <section className="card mt-4 p-5 text-sm">
        <p className="text-ink-600 dark:text-ink-300">
          Có <b>{cau.soLuot}</b> người đã trả lời câu này.
        </p>
        <DanhSachNguoi nhan={`${cau.soDung} đúng`} mau="text-emerald-600" ds={nguoi.dung} />
        <DanhSachNguoi nhan={`${cau.soSai} sai`} mau="text-rose-600" ds={nguoi.sai} />
      </section>

      {/* ── Bình luận ── */}
      <section className="card mt-4 p-5">
        <h2 className="zib-title mb-1">Bình luận ({binhLuan.tong})</h2>
        <p className="mb-3 text-xs text-ink-400">
          Nghiêm cấm gợi ý đáp án cho người chưa trả lời.
        </p>
        <QuizBinhLuan questionId={cau.id} items={binhLuan.items}
          duocBinhLuan={duocBinhLuan} dieuHanh={dieuHanh}
          vuong={duocBinhLuan ? undefined : vuongBinhLuan} />
        <Pagination page={trang} totalPages={soTrangBinhLuan} basePath={goc} pageParam="trang" />
      </section>
    </div>
  );
}

/** Tên người dùng gọn một dòng. */
function Chip({ chip }: { chip: AuthorChip }) {
  return (
    <UserName username={chip.username} name={chip.name} role={chip.role}
      level={chip.level} cosmetics={chip.cosmetics} className="!inline !text-xs" />
  );
}

/**
 * Bốn phương án ở dạng CHỈ ĐỌC.
 *
 * `dapAn` là `undefined` khi người xem chưa được thấy đáp án — và khi ấy nó
 * thật sự không có trong dữ liệu trang, chứ không phải bị tô cùng màu.
 */
function PhuongAn({ options, dapAn, daChon }: {
  options: string[];
  dapAn?: number;
  daChon?: number;
}) {
  return (
    <ul className="grid gap-1.5">
      {options.map((o, i) => {
        const laDapAn = dapAn === i;
        const laChon = daChon === i;
        return (
          <li key={i} className={cn(
            'flex items-start gap-2 rounded-xl border-2 px-3 py-2 text-sm',
            laDapAn
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
              : laChon
                ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40'
                : 'border-ink-200 dark:border-ink-700',
          )}>
            <b className="shrink-0 text-ink-400">{QUIZ_NHAN[i]}.</b>
            <span className="min-w-0">{o}</span>
            {laDapAn && <Check size={16} className="ml-auto shrink-0 text-emerald-600" />}
            {laChon && !laDapAn && <X size={16} className="ml-auto shrink-0 text-rose-600" />}
          </li>
        );
      })}
    </ul>
  );
}

/** Một hàng "N đúng: tên, tên, tên" như bản gốc, nhưng có trần. */
function DanhSachNguoi({ nhan, mau, ds }: {
  nhan: string;
  mau: string;
  ds: { id: string; chip: AuthorChip | null }[];
}) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-500">
      <b className={mau}>{nhan}</b>
      {ds.length > 0 && ':'}
      {ds.map((n) => n.chip && <Chip key={n.id} chip={n.chip} />)}
    </p>
  );
}
