import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getShouts, getShoutHere, markHere, SHOUT_SCOPE } from '@/lib/shout';
import { ReplyContent } from '@/components/forum/ReplyContent';
import { ShoutRoom } from './ShoutRoom';

/**
 * Phòng chat chung, đặt thẳng trên trang chủ.
 *
 * Forum wap ngày xưa để cái chatbox ngay index chứ không bắt bấm sang trang
 * khác — mở trang ra là thấy có người đang nói, biết ngay chỗ này còn sống.
 *
 * Khách vẫn đọc được (để biết điều đó) nhưng muốn nói thì phải đăng nhập.
 */
export async function ChatPanel() {
  const session = await auth();
  const me = session?.user;

  if (me?.id) await markHere(me.id, SHOUT_SCOPE);

  const [shouts, here, meRow] = await Promise.all([
    getShouts(),
    getShoutHere(),
    me?.id ? db.user.findUnique({ where: { id: me.id }, select: { username: true, role: true } }) : null,
  ]);

  // Ngày giờ phải qua JSON để xuống được component phía trình duyệt.
  const initial = shouts.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));

  if (meRow) {
    return (
      <div id="phong-chat" className="scroll-mt-20">
        <ShoutRoom initial={initial} initialHere={here} meUsername={meRow.username} meRole={meRow.role} />
      </div>
    );
  }

  return (
    <section id="phong-chat" className="card scroll-mt-20 overflow-hidden">
      <header className="retro-head flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide">Phòng chat chung</h2>
        <span className="retro-sub opacity-70">{initial.length} câu gần nhất</span>
      </header>

      <div className="retro-stripe max-h-72 overflow-y-auto">
        {initial.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-400">Phòng đang vắng.</p>
        ) : (
          initial.map((s) => (
            <p key={s.id} className="flex gap-2 px-3 py-1.5 text-sm sm:px-4">
              <span className="retro-sub shrink-0 pt-0.5 tabular-nums text-ink-400">
                [{new Date(s.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}]
              </span>
              <span className="min-w-0 flex-1 break-words">
                <b className="text-brand-700 dark:text-brand-300">{s.user.name ?? s.user.username}</b>
                <span className="text-ink-400">: </span>
                {s.deleted
                  ? <em className="text-ink-400">câu này đã bị gỡ</em>
                  : <ReplyContent as="span" content={s.content} className="inline align-middle text-sm [&_img]:max-h-40" />}
              </span>
            </p>
          ))
        )}
      </div>

      <div className="retro-rule flex flex-wrap items-center gap-3 border-t border-ink-100 p-3 dark:border-ink-800">
        <p className="min-w-0 flex-1 text-sm text-ink-500">Đăng nhập để nói chuyện cùng mọi người.</p>
        <Link href="/login?callbackUrl=/" className="btn-primary shrink-0 !py-2"><LogIn size={15} /> Đăng nhập</Link>
      </div>
    </section>
  );
}
