import Link from 'next/link';
import type { Metadata } from 'next';
import { MessagesSquare, LogIn } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getShouts, getShoutHere, markHere, SHOUT_SCOPE, SHOUT_MAX_LEN } from '@/lib/shout';
import { ShoutRoom } from '@/components/chat/ShoutRoom';

export const metadata: Metadata = { title: 'Phòng chat' };
export const dynamic = 'force-dynamic';

/**
 * Phòng chat chung — "chat tổng" của forum wap ngày xưa.
 *
 * Khác nhắn tin riêng ở chỗ ai vào cũng đọc được và chỉ giữ ít câu gần nhất:
 * nói xong rồi trôi, không phải nơi lưu trữ. Khách vãng lai đọc được để biết
 * chỗ này có người, nhưng muốn nói thì phải đăng nhập.
 */
export default async function ChatPage() {
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

  return (
    <div className="space-y-4">
      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
          <MessagesSquare size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black leading-tight text-ink-900 dark:text-white">Phòng chat chung</h1>
          <p className="retro-sub text-ink-400">
            Nói chuyện với cả nhà. Mỗi câu tối đa {SHOUT_MAX_LEN} ký tự, phòng chỉ giữ lại các câu gần nhất.
          </p>
        </div>
      </section>

      {meRow ? (
        <ShoutRoom initial={initial} initialHere={here} meUsername={meRow.username} meRole={meRow.role} />
      ) : (
        <>
          <section className="card overflow-hidden">
            <header className="retro-head px-3 py-2.5 sm:px-4">
              <h2 className="text-sm font-bold uppercase tracking-wide">Đang nói gì trong phòng</h2>
            </header>
            <div className="retro-stripe max-h-[50vh] overflow-y-auto">
              {initial.length === 0 ? (
                <p className="p-10 text-center text-sm text-ink-400">Phòng đang vắng.</p>
              ) : (
                initial.map((s) => (
                  <p key={s.id} className="flex gap-2 px-3 py-1.5 text-sm sm:px-4">
                    <span className="retro-sub shrink-0 pt-0.5 tabular-nums text-ink-400">
                      [{new Date(s.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}]
                    </span>
                    <span className="min-w-0 flex-1 break-words">
                      <b className="text-brand-700 dark:text-brand-300">{s.user.name ?? s.user.username}</b>
                      <span className="text-ink-400">: </span>
                      {s.deleted ? <em className="text-ink-400">câu này đã bị gỡ</em> : s.content}
                    </span>
                  </p>
                ))
              )}
            </div>
          </section>

          <div className="card flex flex-wrap items-center gap-3 p-4">
            <p className="min-w-0 flex-1 text-sm text-ink-500">Đăng nhập để nói chuyện cùng mọi người.</p>
            <Link href="/login?callbackUrl=/chat" className="btn-primary shrink-0 !py-2"><LogIn size={15} /> Đăng nhập</Link>
          </div>
        </>
      )}
    </div>
  );
}
