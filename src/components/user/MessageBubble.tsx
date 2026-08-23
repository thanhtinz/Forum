'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { reactToMessage } from '@/app/(site)/user/messages/actions';
import { MESSAGE_REACTIONS, type ChatBubble } from '@/lib/chat-theme';
import { ReplyContent } from '@/components/forum/ReplyContent';
import { cn } from '@/lib/utils';

export interface ReactionView { emoji: string; mine: boolean }

export interface MessageBubbleProps {
  id: string;
  content: string;
  mine: boolean;
  time: string;
  showMeta: boolean;
  /** Chỉ tin cuối của mình mới hiện dấu đã gửi/đã xem. */
  showTicks: boolean;
  seen: boolean;
  bubble: ChatBubble;
  reactions: ReactionView[];
}

const LONG_PRESS_MS = 450;

export function MessageBubble(p: MessageBubbleProps) {
  const [reactions, setReactions] = useState(p.reactions);
  const [picker, setPicker] = useState(false);
  const [, start] = useTransition();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);

  const mineReaction = reactions.find((r) => r.mine)?.emoji ?? null;

  const send = (emoji: string) => {
    // Cập nhật ngay trên màn hình rồi mới gọi máy chủ, chạm vào thấy phản hồi liền.
    setReactions((cur) => {
      const others = cur.filter((r) => !r.mine);
      return mineReaction === emoji ? others : [...others, { emoji, mine: true }];
    });
    setPicker(false);
    start(async () => {
      const r = await reactToMessage(p.id, emoji);
      // Máy chủ từ chối thì trả lại đúng trạng thái cũ.
      if (r.error) setReactions(p.reactions);
    });
  };

  const startPress = () => {
    clearPress();
    pressTimer.current = setTimeout(() => setPicker(true), LONG_PRESS_MS);
  };
  const clearPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  /** Chạm hai lần liên tiếp trên điện thoại = bấm đúp. */
  const onTouchEnd = () => {
    clearPress();
    const now = Date.now();
    if (now - lastTap.current < 320) { send('❤️'); lastTap.current = 0; }
    else lastTap.current = now;
  };

  // Chỉ vẽ bong bóng; hàng flex và avatar do trang bao ngoài lo. Bọc thêm một
  // hàng flex nữa ở đây sẽ khiến hàng bên trong co lại theo nội dung.
  return (
    <div className="relative max-w-[78%] sm:max-w-[70%]">
      {picker && (
          <>
            {/* Nền trong suốt để chạm ra ngoài là đóng */}
            <button type="button" aria-label="Đóng" onClick={() => setPicker(false)}
              className="fixed inset-0 z-40 cursor-default" />
            <div className={cn('absolute bottom-full z-50 mb-1 flex gap-0.5 rounded-full border border-ink-200 bg-white p-1 shadow-lg dark:border-ink-700 dark:bg-ink-900',
              p.mine ? 'right-0' : 'left-0')}>
              {MESSAGE_REACTIONS.map((e) => (
                <button key={e} type="button" onClick={() => send(e)}
                  title={`Thả ${e}`}
                  className={cn('grid size-8 place-items-center rounded-full text-lg transition-transform hover:scale-125',
                    mineReaction === e && 'bg-brand-100 dark:bg-brand-950')}>
                  {e}
                </button>
              ))}
            </div>
          </>
        )}

        <div
          onDoubleClick={() => send('❤️')}
          onPointerDown={(e) => { if (e.pointerType !== 'touch') startPress(); }}
          onPointerUp={clearPress}
          onPointerLeave={clearPress}
          onTouchStart={startPress}
          onTouchEnd={onTouchEnd}
          onContextMenu={(e) => { e.preventDefault(); setPicker(true); }}
          title="Bấm đúp để thả tim · giữ để chọn cảm xúc"
          className={cn('select-none px-3.5 py-2',
            p.mine ? p.bubble.mine : p.bubble.theirs,
            p.bubble.radius,
            p.mine ? 'rounded-br-md' : 'rounded-bl-md',
            reactions.length > 0 && 'mb-2.5')}>
          <ReplyContent content={p.content}
            className={cn('whitespace-pre-wrap break-words text-sm leading-relaxed', p.mine ? '' : 'text-inherit')} />

          {p.showMeta && (
            <div className={cn('mt-1 flex items-center justify-end gap-1 text-[11px]',
              p.mine ? p.bubble.mineMuted : 'text-ink-400')}>
              {p.time}
              {p.showTicks && (p.seen
                ? <CheckCheck size={13} aria-label="Đã xem" />
                : <Check size={13} aria-label="Đã gửi" />)}
            </div>
          )}
        </div>

        {reactions.length > 0 && (
          <div className={cn('absolute -bottom-1 flex items-center gap-0.5 rounded-full border border-ink-200 bg-white px-1.5 py-0.5 text-xs shadow-sm dark:border-ink-700 dark:bg-ink-900',
            p.mine ? 'right-2' : 'left-2')}>
            {reactions.map((r, i) => <span key={`${r.emoji}${i}`}>{r.emoji}</span>)}
          </div>
        )}
    </div>
  );
}
