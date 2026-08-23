import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { otherId } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { ReplyContent } from '@/components/forum/ReplyContent';
import { MessageComposer } from '@/components/user/MessageComposer';
import { ScrollToLatest } from '@/components/user/ScrollToLatest';
import { markConversationRead } from '../actions';

export const metadata: Metadata = { title: 'Trò chuyện' };
export const dynamic = 'force-dynamic';

const TAKE = 100;
/** Hai tin liền nhau của cùng người, cách nhau dưới 5 phút thì gộp thành một cụm. */
const GROUP_GAP_MS = 5 * 60 * 1000;

const time = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

function dayLabel(d: Date): string {
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Avatar({ image, name, className }: { image: string | null; name: string; className?: string }) {
  return image
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={image} alt="" className={cn('rounded-full object-cover', className)} />
    : <span className={cn('grid place-items-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300', className)}>
        {name.charAt(0).toUpperCase()}
      </span>;
}

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
  const partnerName = partner.name || partner.username || 'Thành viên';

  const rows = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'desc' },
    take: TAKE,
    select: { id: true, content: true, senderId: true, createdAt: true, readAt: true },
  });
  rows.reverse();

  // Mở hội thoại là coi như đã đọc.
  await markConversationRead(id).catch(() => {});

  // Đánh dấu tin cuối của mỗi cụm để chỉ cụm đó hiện avatar và giờ.
  const items = rows.map((m, i) => {
    const prev = rows[i - 1];
    const next = rows[i + 1];
    const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
    const sameAsPrev = !!prev && prev.senderId === m.senderId
      && m.createdAt.getTime() - prev.createdAt.getTime() < GROUP_GAP_MS && !newDay;
    const sameAsNext = !!next && next.senderId === m.senderId
      && next.createdAt.getTime() - m.createdAt.getTime() < GROUP_GAP_MS
      && dayLabel(next.createdAt) === dayLabel(m.createdAt);
    return { ...m, newDay, startsGroup: !sameAsPrev, endsGroup: !sameAsNext };
  });

  const lastMine = [...rows].reverse().find((m) => m.senderId === me);

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[28rem] flex-col gap-3">
      {/* Thanh tiêu đề */}
      <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-ink-200 bg-white px-3 py-2.5 dark:border-ink-700 dark:bg-ink-900">
        <Link href="/user/messages" title="Về hộp thư"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
          <ArrowLeft size={18} />
        </Link>
        <Avatar image={partner.image} name={partnerName} className="size-10 shrink-0" />
        <div className="min-w-0">
          <h1 className="truncate font-bold leading-tight text-ink-900 dark:text-white">{partnerName}</h1>
          {partner.username && (
            <Link href={`/u/${partner.username}`} className="text-xs text-ink-400 hover:text-brand-600">@{partner.username}</Link>
          )}
        </div>
      </div>

      {/* Khung tin nhắn — cuộn riêng, ô soạn luôn nằm dưới cùng */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-ink-200 bg-ink-50/60 p-3 dark:border-ink-700 dark:bg-ink-950/40">
        {items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Avatar image={partner.image} name={partnerName} className="size-16" />
            <p className="mt-3 font-semibold text-ink-700 dark:text-ink-200">{partnerName}</p>
            <p className="mt-1 text-sm text-ink-400">Chưa có tin nhắn nào. Gửi lời chào đi!</p>
          </div>
        )}

        {items.length === TAKE && (
          <p className="mb-2 text-center text-xs text-ink-400">Chỉ hiện {TAKE} tin gần nhất.</p>
        )}

        <div className="space-y-0.5">
          {items.map((m) => {
            const mine = m.senderId === me;
            return (
              <div key={m.id}>
                {m.newDay && (
                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{dayLabel(m.createdAt)}</span>
                    <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
                  </div>
                )}

                <div className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start',
                  m.startsGroup && !m.newDay && 'mt-2')}>
                  {/* Avatar chỉ ở tin cuối cụm để cột trái không bị lặp */}
                  {!mine && (m.endsGroup
                    ? <Avatar image={partner.image} name={partnerName} className="size-7 shrink-0 text-xs" />
                    : <span className="size-7 shrink-0" />)}

                  <div className={cn('max-w-[78%] px-3.5 py-2 sm:max-w-[70%]',
                    mine
                      ? 'bg-brand-500 text-white'
                      : 'border border-ink-200 bg-white text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100',
                    // Bo góc theo vị trí trong cụm để cụm trông liền mạch
                    mine
                      ? cn('rounded-2xl rounded-br-md', m.startsGroup && 'rounded-tr-2xl', !m.endsGroup && 'rounded-br-md')
                      : cn('rounded-2xl rounded-bl-md', m.startsGroup && 'rounded-tl-2xl', !m.endsGroup && 'rounded-bl-md'),
                  )}>
                    <ReplyContent content={m.content}
                      className={cn('whitespace-pre-wrap break-words text-sm leading-relaxed',
                        mine ? 'text-white' : 'text-ink-800 dark:text-ink-100')} />

                    {m.endsGroup && (
                      <div className={cn('mt-1 flex items-center justify-end gap-1 text-[11px]',
                        mine ? 'text-white/70' : 'text-ink-400')}>
                        {time(m.createdAt)}
                        {mine && m.id === lastMine?.id && (
                          m.readAt
                            ? <CheckCheck size={13} aria-label="Đã xem" />
                            : <Check size={13} aria-label="Đã gửi" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <ScrollToLatest trigger={items.at(-1)?.id ?? 'empty'} />
      </div>

      <MessageComposer conversationId={id} />
    </div>
  );
}
