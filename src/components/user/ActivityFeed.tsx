import Link from 'next/link';
import { MessagesSquare, CornerDownRight, Users, Image as ImageIcon } from 'lucide-react';
import { fmtAgo } from '@/lib/utils';
import type { ActivityItem, ActivityKind } from '@/lib/activity';

const LOOK: Record<ActivityKind, { icon: typeof MessagesSquare; verb: string; tint: string }> = {
  THREAD: { icon: MessagesSquare, verb: 'lập chủ đề', tint: 'text-brand-500' },
  REPLY: { icon: CornerDownRight, verb: 'trả lời trong', tint: 'text-emerald-500' },
  CLUB_POST: { icon: Users, verb: 'đăng lên bảng tin', tint: 'text-amber-500' },
  PHOTO: { icon: ImageIcon, verb: 'thêm ảnh vào', tint: 'text-fuchsia-500' },
};

/** Dòng thời gian gộp mọi việc gần đây của một thành viên. */
export function ActivityFeed({ items, name }: { items: ActivityItem[]; name: string }) {
  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-500">
        {name} chưa có hoạt động nào để khoe.
      </div>
    );
  }

  return (
    <ol className="card divide-y divide-ink-100 dark:divide-ink-800">
      {items.map((it) => {
        const look = LOOK[it.kind];
        const Icon = look.icon;
        return (
          <li key={it.id}>
            <Link href={it.href} className="flex gap-3 p-3.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
              <span className={`mt-0.5 shrink-0 ${look.tint}`}><Icon size={17} /></span>

              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="text-ink-500">{look.verb} </span>
                  <span className="font-semibold text-ink-800 dark:text-ink-100">{it.title}</span>
                </p>
                {it.excerpt && <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{it.excerpt}</p>}
                <p className="retro-sub mt-1 text-ink-400">
                  {it.where && <>{it.where} · </>}{fmtAgo(it.at)}
                </p>
              </div>

              {it.thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.thumb} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
