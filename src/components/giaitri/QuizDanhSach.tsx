import Link from 'next/link';
import { CircleHelp, Coins } from 'lucide-react';
import { QUIZ_TRANG_THAI_LABEL, rutGon } from '@/lib/quiz-const';
import { cn } from '@/lib/utils';

export interface QuizDongView {
  id: string;
  content: string;
  price: number;
  category?: { slug: string; name: string } | null;
  soLuot?: number;
  /** Chỉ có ở danh sách "Câu hỏi của bạn". */
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  soDung?: number;
  soSai?: number;
  reviewNote?: string | null;
}

const BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

/**
 * Một dòng danh sách câu hỏi, đúng kiểu bản gốc: dấu hỏi, nội dung CẮT 100 KÝ
 * TỰ ĐẦU, số điểm cọc trong ngoặc, rồi tới liên kết "Trả lời".
 *
 * Cắt ở đây chứ không cắt bằng CSS: dòng dài mà chỉ giấu bằng `truncate` thì cả
 * bài văn vẫn nằm trong mã nguồn trang, và trên máy màn rộng nó bung ra dài
 * ngoẵng, danh sách gãy hết nhịp.
 */
function Dong({ c, hienTrangThai }: { c: QuizDongView; hienTrangThai: boolean }) {
  // Câu chưa duyệt thì chưa có trang trả lời — bấm vào chỉ ra trang trống.
  const moDuoc = !hienTrangThai || c.status === 'APPROVED';

  return (
    <li className="flex flex-wrap items-start gap-x-2 gap-y-1 border-b border-ink-100 px-3 py-2.5 last:border-0 dark:border-ink-800">
      <CircleHelp size={15} className="mt-0.5 shrink-0 text-violet-500" />

      <span className="min-w-0 flex-1 text-sm text-ink-800 dark:text-ink-100">
        {rutGon(c.content)}
        <span className="ml-1 whitespace-nowrap text-xs text-ink-400">({c.price} điểm)</span>
      </span>

      {hienTrangThai && c.status && (
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', BADGE[c.status])}>
          {QUIZ_TRANG_THAI_LABEL[c.status]}
        </span>
      )}

      {moDuoc ? (
        <Link href={`/giai-tri/trac-nghiem/cau-hoi/${c.id}`}
          className="shrink-0 text-sm font-semibold text-brand-600 hover:underline">
          {hienTrangThai ? 'Xem' : 'Trả lời'}
        </Link>
      ) : (
        <span className="shrink-0 text-sm text-ink-300">Chưa hiện</span>
      )}

      <span className="w-full text-xs text-ink-400">
        {c.category && (
          <>
            <Link href={`/giai-tri/trac-nghiem/the-loai/${c.category.slug}`} className="hover:text-brand-600">
              {c.category.name}
            </Link>
            {' · '}
          </>
        )}
        {hienTrangThai
          ? `${c.soLuot ?? 0} lượt trả lời · ${c.soDung ?? 0} đúng, ${c.soSai ?? 0} sai`
          : `${c.soLuot ?? 0} lượt trả lời`}
        {hienTrangThai && c.status === 'REJECTED' && c.reviewNote && (
          <span className="text-rose-600"> · Lý do từ chối: {c.reviewNote}</span>
        )}
      </span>
    </li>
  );
}

/**
 * Danh sách câu hỏi kèm dòng "Tổng số" ở cuối — bản gốc đóng mọi danh sách
 * bằng đúng dòng ấy, và nó có ích thật: biết ngay còn bao nhiêu câu nữa.
 */
export function QuizDanhSach({ items, tong, trong, hienTrangThai = false }: {
  items: QuizDongView[];
  tong: number;
  /** Câu hiện ra khi danh sách rỗng. */
  trong: string;
  /** Bật ở "Câu hỏi của bạn": thêm nhãn duyệt và số đúng/sai. */
  hienTrangThai?: boolean;
}) {
  if (items.length === 0) {
    return <p className="card p-6 text-center text-sm text-ink-500">{trong}</p>;
  }
  return (
    <div className="card overflow-hidden">
      <ul>
        {items.map((c) => <Dong key={c.id} c={c} hienTrangThai={hienTrangThai} />)}
      </ul>
      <p className="flex items-center gap-1.5 border-t border-ink-100 bg-ink-50/60 px-3 py-2 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:bg-ink-800/40">
        <Coins size={13} className="text-amber-500" /> Tổng số: {tong} câu
      </p>
    </div>
  );
}
