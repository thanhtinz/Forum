import Link from 'next/link';
import { format } from 'date-fns';
import { CheckCircle2, CalendarDays, MessageSquare } from 'lucide-react';
import { cn, fmtCount } from '@/lib/utils';
import { bbcodeToHtml } from '@/lib/bbcode';
import { LevelBadge } from '@/components/LevelBadge';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import { NO_COSMETICS, type Cosmetics } from '@/lib/shop-const';

export interface PostAuthor {
  username: string | null;
  name: string | null;
  image: string | null;
  level: number;
  createdAt?: Date;
  postCount?: number;
  /** Huy hiệu cấp lấy từ LevelRule (nếu admin đã cấu hình cấp này). */
  levelIcon?: string | null;
  levelColor?: string | null;
  levelName?: string | null;
  /** Chữ ký (BBCode thô) — dán dưới mọi bài của người này. */
  signature?: string | null;
  /** Tâm trạng — dòng chữ ngắn người dùng tự đặt. */
  mood?: string | null;
  /** Đồ trang trí mua ở cửa hàng: màu tên, khung avatar, huy hiệu. */
  cosmetics?: Cosmetics;
}

export function displayName(u: PostAuthor | null | undefined): string {
  return u?.name ?? u?.username ?? 'Ẩn danh';
}

/** Danh hiệu theo cấp độ — kiểu diễn đàn truyền thống. */
function rankOf(level: number): string {
  if (level >= 10) return 'Kỳ cựu';
  if (level >= 7) return 'Thành viên vàng';
  if (level >= 4) return 'Thành viên tích cực';
  if (level >= 2) return 'Thành viên';
  return 'Thành viên mới';
}

/**
 * Một bài trong chủ đề (bài mở đầu hoặc trả lời) theo bố cục diễn đàn cổ điển:
 * cột thông tin người đăng bên trái, nội dung bên phải, có số thứ tự bài.
 */
export function ThreadPost({ author, createdAt, index, isSolution, header, children, actions }: {
  author: PostAuthor;
  createdAt: Date;
  /** Số thứ tự bài trong chủ đề: #1 là bài mở đầu. */
  index: number;
  isSolution?: boolean;
  /** Nội dung phụ phía trên (nhãn, tiêu đề…) */
  header?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const name = displayName(author);
  const href = `/u/${author.username ?? ''}`;
  const cos = author.cosmetics ?? NO_COSMETICS;

  return (
    <article
      id={`bai-${index}`}
      className={cn(
        'card scroll-mt-20 overflow-hidden p-0',
        isSolution && 'ring-2 ring-emerald-400/70',
      )}
    >
      {isSolution && (
        <p className="flex items-center gap-1.5 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 size={15} /> Câu trả lời được chọn
        </p>
      )}

      <div className="flex flex-col sm:flex-row">
        {/* Cột người đăng */}
        <aside className="flex shrink-0 items-center gap-3 border-b border-ink-100 bg-ink-50/70 p-3 sm:w-[150px] sm:flex-col sm:items-center sm:gap-1.5 sm:border-b-0 sm:border-r sm:p-4 sm:text-center dark:border-ink-800 dark:bg-ink-800/40">
          <Link href={href} className="shrink-0">
            <Avatar image={author.image} name={name} cosmetics={cos} size={64} className="hidden sm:inline-block" />
            <Avatar image={author.image} name={name} cosmetics={cos} size={40} className="sm:hidden" />
          </Link>

          <div className="min-w-0 sm:w-full">
            {/* Màu nick: ưu tiên màu mua ở cửa hàng, sau đó tới màu cấp do
                admin đặt — "mod màu nick thành viên" của forum wap ngày xưa. */}
            <UserName username={author.username} name={author.name} levelColor={author.levelColor}
              cosmetics={cos} className="leading-tight" />
            <p className="truncate text-[11px] text-ink-400">{author.levelName ?? rankOf(author.level)}</p>
            <LevelBadge className="mt-1" level={author.level}
              icon={author.levelIcon} color={author.levelColor} name={author.levelName} />
          </div>

          {author.mood?.trim() && (
            <p className="retro-sub hidden w-full truncate italic text-ink-400 sm:block" title={author.mood}>
              “{author.mood}”
            </p>
          )}

          {/* Số liệu — chỉ hiện trên màn hình lớn để cột không quá cao trên mobile */}
          <dl className="hidden w-full gap-1 border-t border-ink-200 pt-2 text-[11px] text-ink-400 sm:block dark:border-ink-700">
            {author.postCount != null && (
              <div className="flex items-center justify-center gap-1">
                <MessageSquare size={11} /> {fmtCount(author.postCount)} bài
              </div>
            )}
            {author.createdAt && (
              <div className="flex items-center justify-center gap-1">
                <CalendarDays size={11} /> {format(author.createdAt, 'MM/yyyy')}
              </div>
            )}
          </dl>
        </aside>

        {/* Nội dung bài */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-2 text-xs text-ink-400 dark:border-ink-800">
            <time dateTime={createdAt.toISOString()}>{format(createdAt, 'HH:mm · dd/MM/yyyy')}</time>
            <Link href={`#bai-${index}`} className="ml-auto font-semibold text-ink-400 hover:text-brand-600">#{index}</Link>
          </div>

          <div className="p-4">
            {header}
            {children}

            {/* Chữ ký: gạch chấm ngăn với nội dung, chữ nhỏ mờ — đúng nếp
                forum ngày xưa, để không ai nhầm chữ ký với phần bài viết. */}
            {author.signature?.trim() ? (
              <div
                className="retro-sub retro-rule mt-4 pt-2 text-ink-400 [&_a]:text-brand-500"
                dangerouslySetInnerHTML={{ __html: bbcodeToHtml(author.signature) }}
              />
            ) : null}
          </div>

          {actions && <div className="border-t border-ink-100 px-4 py-2 dark:border-ink-800">{actions}</div>}
        </div>
      </div>
    </article>
  );
}
