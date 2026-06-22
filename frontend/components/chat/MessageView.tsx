'use client';

import Link from 'next/link';
import { FileText, Reply, Music } from 'lucide-react';
import { ChatMsg, musicEmbed } from '@/lib/chat';
import { UserBadges, roleBadgesFromUser } from '@/components/UserBadges';
import { cssToStyle } from '@/lib/nameEffect';

// Tách @username thành liên kết tới trang cá nhân (đổi màu theo bong bóng để không mất chữ)
function renderWithMentions(text: string, mine?: boolean) {
  const cls = mine ? 'font-semibold text-amber-200 underline' : 'font-medium text-brand-600 hover:underline';
  return text.split(/(@\w{1,30})/g).map((p, i) =>
    /^@\w{1,30}$/.test(p)
      ? <Link key={i} href={`/profile?u=${encodeURIComponent(p.slice(1))}`} className={cls}>{p}</Link>
      : <span key={i}>{p}</span>,
  );
}

export function MessageBody({ m, mine }: { m: ChatMsg; mine?: boolean }) {
  switch (m.type) {
    case 'STICKER':
      return <img src={m.content} alt={m.type} className="h-20 w-20 object-contain" />;
    case 'GIF':
      return <img src={m.content} alt={m.type} className="max-h-32 max-w-[160px] rounded-lg" />;
    case 'IMAGE':
      return <a href={m.content} target="_blank" rel="noreferrer"><img src={m.content} alt="" className="max-h-64 rounded-lg" /></a>;
    case 'VIDEO':
      return <video src={m.content} controls className="max-h-64 rounded-lg" />;
    case 'VOICE':
      return <audio src={m.content} controls className="h-10 w-56 max-w-full" />;
    case 'FILE': {
      const name = m.metadata?.filename || m.content.split('/').pop() || 'tập tin';
      const size = m.metadata?.size ? ` · ${(m.metadata.size / 1024).toFixed(0)} KB` : '';
      return (
        <a href={m.content} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">
          <FileText size={16} /> {name}{size}
        </a>
      );
    }
    case 'MUSIC': {
      const e = musicEmbed(m.content, m.metadata?.provider);
      if (e?.kind === 'iframe') return <iframe src={e.src} className="h-20 w-72 max-w-full rounded-lg" allow="encrypted-media" />;
      if (e?.kind === 'audio') return <audio src={e.src} controls className="h-10 w-56 max-w-full" />;
      return <a href={m.content} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline"><Music size={15} /> {m.content}</a>;
    }
    default:
      return <div className="whitespace-pre-wrap break-words">{renderWithMentions(m.content, mine)}</div>;
  }
}

export function MessageView({ m, mine, showName }: { m: ChatMsg; mine: boolean; showName: boolean }) {
  const name = m.sender?.displayName || m.sender?.username || m.senderId.slice(0, 6);
  const isMedia = m.type === 'STICKER' || m.type === 'GIF' || m.type === 'IMAGE';
  // Bong bóng chat tùy chỉnh (CSS mua ở cửa hàng) — không áp cho media (nền trong suốt)
  const bubbleCss = !isMedia ? cssToStyle(m.sender?.chatBubbleCss) : undefined;
  const bubble = isMedia
    ? 'bg-transparent p-0'
    : bubbleCss ? '' : mine ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800';
  return (
    <div className={`inline-block max-w-full rounded-2xl px-3 py-2 text-sm ${bubble}`} style={bubbleCss}>
      {!mine && showName && (
        <div className="mb-0.5 flex items-center gap-1 text-[11px] font-medium opacity-80">
          <span style={cssToStyle(m.sender?.nameEffectCss)}>{name}</span>
          <UserBadges badges={roleBadgesFromUser({ role: m.sender?.role, verifiedBadge: m.sender?.verifiedBadge })} size="xs" iconOnly />
        </div>
      )}
      {m.replyTo && (
        <div className="mb-1 flex items-center gap-1 rounded-md border-l-2 border-current/40 bg-black/5 px-2 py-1 text-[11px] opacity-80 dark:bg-white/10">
          <Reply size={11} /> {m.replyTo.type === 'TEXT' ? m.replyTo.content.slice(0, 60) : m.replyTo.type}
        </div>
      )}
      <MessageBody m={m} mine={mine} />
    </div>
  );
}
