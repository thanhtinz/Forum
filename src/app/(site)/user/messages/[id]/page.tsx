import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Check, CheckCheck, ChevronUp } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { otherId } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { MessageBubble } from '@/components/user/MessageBubble';
import { ChatSettings } from '@/components/user/ChatSettings';
import { getTheme, getBubble } from '@/lib/chat-theme';
import { MessageComposer } from '@/components/user/MessageComposer';
import { ScrollToLatest } from '@/components/user/ScrollToLatest';
import { LiveRefresh } from '@/components/user/LiveRefresh';
import { markConversationRead, purgeExpiredMessages } from '../actions';

export const metadata: Metadata = { title: 'Trò chuyện' };
export const dynamic = 'force-dynamic';

/** Số tin hiện mặc định; bấm "xem tin cũ hơn" thì tăng dần tới MAX_TAKE. */
const TAKE = 100;
const TAKE_STEP = 100;
const MAX_TAKE = 1000;
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

export default async function ConversationPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ take?: string }>;
}) {
  const { id } = await params;
  const { take: takeRaw } = await searchParams;
  const take = Math.min(MAX_TAKE, Math.max(TAKE, parseInt(takeRaw ?? '', 10) || TAKE));
  const session = await auth();
  const me = session?.user?.id;
  if (!me) redirect('/login');

  const convo = await db.conversation.findUnique({
    where: { id },
    select: {
      id: true, userAId: true, userBId: true,
      theme: true, bubble: true, nicknameA: true, nicknameB: true, autoDeleteHours: true,
      userA: { select: { id: true, name: true, username: true, image: true } },
      userB: { select: { id: true, name: true, username: true, image: true } },
    },
  });
  // Người ngoài hội thoại thì coi như không có trang này.
  if (!convo || (convo.userAId !== me && convo.userBId !== me)) notFound();

  const partner = otherId(convo, me) === convo.userA.id ? convo.userA : convo.userB;
  const partnerIsA = partner.id === convo.userAId;
  // Biệt danh (nếu có) thay tên hiển thị ở mọi chỗ trong đoạn chat.
  const partnerNick = (partnerIsA ? convo.nicknameA : convo.nicknameB) ?? '';
  const myNick = (partnerIsA ? convo.nicknameB : convo.nicknameA) ?? '';
  const realName = partner.name || partner.username || 'Thành viên';
  const partnerName = partnerNick || realName;
  const theme = getTheme(convo.theme);
  const bubble = getBubble(convo.bubble);

  // Tin quá hạn phải biến mất trước khi đọc, không thì vẫn hiện thêm một lần.
  if (convo.autoDeleteHours) await purgeExpiredMessages(id, convo.autoDeleteHours).catch(() => {});

  const [rows, totalMessages] = await Promise.all([
    db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true, content: true, senderId: true, createdAt: true, readAt: true,
        reactions: { select: { emoji: true, userId: true } },
      },
    }),
    db.message.count({ where: { conversationId: id } }),
  ]);
  rows.reverse();
  const hasOlder = totalMessages > rows.length;

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
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-bold leading-tight text-ink-900 dark:text-white">{partnerName}</h1>
          <p className="truncate text-xs text-ink-400">
            {partnerNick && <span className="mr-1">{realName} ·</span>}
            {partner.username && (
              <Link href={`/u/${partner.username}`} className="hover:text-brand-600">@{partner.username}</Link>
            )}
            {convo.autoDeleteHours ? <span className="ml-1">· tự xoá sau {convo.autoDeleteHours}h</span> : null}
          </p>
        </div>
        <ChatSettings conversationId={id} theme={convo.theme} bubble={convo.bubble}
          autoDeleteHours={convo.autoDeleteHours ?? 0}
          me={{ id: me, name: session.user.name ?? 'Bạn', nickname: myNick }}
          partner={{ id: partner.id, name: realName, nickname: partnerNick }} />
      </div>

      {/* Khung tin nhắn — cuộn riêng, ô soạn luôn nằm dưới cùng */}
      <div style={theme.style}
        className={cn('min-h-0 flex-1 overflow-y-auto rounded-2xl border border-ink-200 p-3 dark:border-ink-700', theme.className)}>
        {items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Avatar image={partner.image} name={partnerName} className="size-16" />
            <p className="mt-3 font-semibold text-ink-700 dark:text-ink-200">{partnerName}</p>
            <p className="mt-1 text-sm text-ink-400">Chưa có tin nhắn nào. Gửi lời chào đi!</p>
          </div>
        )}

        {hasOlder && (
          <div className="mb-3 text-center">
            {take < MAX_TAKE ? (
              <Link href={`/user/messages/${id}?take=${take + TAKE_STEP}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800">
                <ChevronUp size={14} /> Xem tin cũ hơn
              </Link>
            ) : (
              <p className="text-xs text-ink-400">Chỉ xem được {MAX_TAKE} tin gần nhất.</p>
            )}
          </div>
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

                  <MessageBubble
                    id={m.id} content={m.content} mine={mine}
                    time={time(m.createdAt)} showMeta={m.endsGroup}
                    showTicks={mine && m.id === lastMine?.id} seen={!!m.readAt}
                    bubble={bubble}
                    reactions={m.reactions.map((r) => ({ emoji: r.emoji, mine: r.userId === me }))} />
                </div>
              </div>
            );
          })}
        </div>

        <ScrollToLatest trigger={items.at(-1)?.id ?? 'empty'} enabled={take === TAKE} />
      </div>

      <MessageComposer conversationId={id} />
      <LiveRefresh />
    </div>
  );
}
