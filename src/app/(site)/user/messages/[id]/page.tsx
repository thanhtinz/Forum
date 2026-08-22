import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { otherId } from '@/lib/messages';
import { fmtAgo, cn } from '@/lib/utils';
import { MessageComposer } from '@/components/user/MessageComposer';
import { markConversationRead } from '../actions';

export const metadata: Metadata = { title: 'Trò chuyện' };
export const dynamic = 'force-dynamic';

const TAKE = 100;

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const me = session?.user?.id;
  if (!me) redirect('/login');

  const convo = await db.conversation.findUnique({
    where: { id },
    select: {
      id: true, userAId: true, userBId: true,
      userA: { select: { id: true, name: true, username: true, image: true } },
      userB: { select: { id: true, name: true, username: true, image: true } },
    },
  });
  // Người ngoài hội thoại thì coi như không có trang này.
  if (!convo || (convo.userAId !== me && convo.userBId !== me)) notFound();

  const partner = otherId(convo, me) === convo.userA.id ? convo.userA : convo.userB;
  const name = partner.name || partner.username || 'Thành viên';

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'desc' },
    take: TAKE,
    select: { id: true, content: true, senderId: true, createdAt: true, readAt: true },
  });
  messages.reverse();

  // Mở hội thoại là coi như đã đọc.
  await markConversationRead(id).catch(() => {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/user/messages" title="Về hộp thư"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800">
          <ArrowLeft size={16} />
        </Link>
        {partner.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={partner.image} alt="" className="size-10 rounded-full object-cover" />
          : <span className="grid size-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {name.charAt(0).toUpperCase()}
            </span>}
        <div className="min-w-0">
          <h1 className="truncate font-bold text-ink-900 dark:text-white">{name}</h1>
          {partner.username && (
            <Link href={`/u/${partner.username}`} className="text-xs text-ink-400 hover:text-brand-600">@{partner.username}</Link>
          )}
        </div>
      </div>

      <div className="card space-y-3 p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-400">Chưa có tin nhắn. Gửi lời chào đi!</p>
        )}
        {messages.length === TAKE && (
          <p className="text-center text-xs text-ink-400">Chỉ hiện {TAKE} tin gần nhất.</p>
        )}

        {messages.map((m) => {
          const mine = m.senderId === me;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2',
                mine
                  ? 'bg-brand-500 text-white'
                  : 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100')}>
                <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                <p className={cn('mt-1 text-[11px]', mine ? 'text-white/70' : 'text-ink-400')}>
                  {fmtAgo(m.createdAt)}
                  {mine && m.readAt && ' · đã xem'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <MessageComposer conversationId={id} />
    </div>
  );
}
