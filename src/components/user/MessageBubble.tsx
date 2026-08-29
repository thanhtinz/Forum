'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCheck, Reply, Trash2, CornerUpLeft } from 'lucide-react';
import { reactToMessage, unsendMessage } from '@/app/(site)/user/messages/actions';
import { MESSAGE_REACTIONS, type ResolvedBubble } from '@/lib/chat-theme';
import { ReplyContent } from '@/components/forum/ReplyContent';
import { useChatReply } from '@/components/user/ChatReplyContext';
import { Popover } from '@/components/Popover';
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
  bubble: ResolvedBubble;
  reactions: ReactionView[];
  /** Tin đã thu hồi: chỉ còn dòng ghi chú, không thả cảm xúc hay trích dẫn được. */
  deleted?: boolean;
  /** Tin được trích dẫn, hiện thành khối nhỏ phía trên nội dung. */
  quote?: { author: string; text: string } | null;
  /** Tên hiển thị của người gửi, dùng khi tin này được trích dẫn. */
  authorName: string;
}

const LONG_PRESS_MS = 450;

export function MessageBubble(p: MessageBubbleProps) {
  const [reactions, setReactions] = useState(p.reactions);
  const [picker, setPicker] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const { setReplyTo } = useChatReply();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);

  const mineReaction = reactions.find((r) => r.mine)?.emoji ?? null;

  const send = (emoji: string) => {
    if (p.deleted) return;
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

  // `Popover` bám vào bong bóng nên mốc phải là state — ref không dựng lại hình.
  const [bongBong, setBongBong] = useState<HTMLDivElement | null>(null);

  const startPress = () => {
    if (p.deleted) return;
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
    <div ref={setBongBong} className="relative max-w-[78%] sm:max-w-[70%]">
      {/* Bảng cảm xúc dựng ở gốc trang. Khung cuộn của phòng chat có
          `overflow-y-auto`, nên bảng `absolute` đặt trên bong bóng trên cùng bị
          khung ấy cắt mất — nhấn giữ thì bảng có mở, mà chỉ thấy một vệt. */}
      <Popover open={picker} anchor={bongBong} onClose={() => setPicker(false)}
        side="top" align={p.mine ? 'right' : 'left'} gap={4}
        className="rounded-full border border-ink-200 bg-white p-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
            <div className="flex gap-0.5">
              {MESSAGE_REACTIONS.map((e) => (
                <button key={e} type="button" onClick={() => send(e)}
                  title={`Thả ${e}`}
                  className={cn('grid size-8 place-items-center rounded-full text-lg transition-transform hover:scale-125',
                    mineReaction === e && 'bg-brand-100 dark:bg-brand-950')}>
                  {e}
                </button>
              ))}

              <span className="mx-0.5 w-px self-stretch bg-ink-200 dark:bg-ink-700" />

              <button type="button" title="Trả lời tin này"
                onClick={() => { setPicker(false); setReplyTo({ id: p.id, author: p.authorName, text: p.content }); }}
                className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
                <Reply size={16} />
              </button>

              {p.mine && (
                <button type="button" title="Thu hồi tin"
                  onClick={() => {
                    setPicker(false);
                    if (!confirm('Thu hồi tin này? Người kia sẽ không đọc được nữa.')) return;
                    start(async () => { await unsendMessage(p.id); router.refresh(); });
                  }}
                  className="grid size-8 place-items-center rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
      </Popover>

        {/* Ảnh trang trí nằm ngoài bong bóng nên phải bọc riêng để không bị cắt góc */}
        <div className="relative">
          {p.bubble.decor && !p.deleted && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.bubble.decor} alt="" aria-hidden
              className={cn('pointer-events-none absolute -top-5 h-7 w-auto', p.mine ? 'right-3' : 'left-3')} />
          )}

        <div
          onDoubleClick={() => send('❤️')}
          onPointerDown={(e) => { if (e.pointerType !== 'touch') startPress(); }}
          onPointerUp={clearPress}
          onPointerLeave={clearPress}
          onTouchStart={startPress}
          onTouchEnd={onTouchEnd}
          onContextMenu={(e) => { e.preventDefault(); setPicker(true); }}
          title={p.deleted ? 'Tin đã thu hồi' : 'Bấm đúp để thả tim · giữ để chọn cảm xúc, trả lời, thu hồi'}
          style={p.deleted ? undefined : (p.mine ? p.bubble.styleMine : p.bubble.styleTheirs)}
          className={cn('select-none px-3.5 py-2',
            // Tin đã thu hồi để viền mờ cho khác hẳn tin còn đọc được.
            p.deleted
              ? 'border border-dashed border-ink-300 text-ink-400 dark:border-ink-600 dark:text-ink-500'
              : (p.mine ? p.bubble.mine : p.bubble.theirs),
            p.bubble.radius,
            p.mine ? 'rounded-br-md' : 'rounded-bl-md',
            reactions.length > 0 && 'mb-2.5')}>
          {p.quote && (
            <div className={cn('mb-1.5 flex gap-1.5 rounded-lg border-l-2 px-2 py-1 text-xs',
              p.mine ? 'border-white/50 bg-white/15' : 'border-ink-300 bg-ink-100/70 dark:border-ink-600 dark:bg-ink-800/70')}>
              <CornerUpLeft size={12} className="mt-0.5 shrink-0 opacity-70" />
              <span className="min-w-0">
                <span className="block font-semibold opacity-90">{p.quote.author}</span>
                <span className="line-clamp-2 opacity-75">{p.quote.text}</span>
              </span>
            </div>
          )}

          {p.deleted ? (
            <p className="text-sm italic">Tin nhắn đã được thu hồi</p>
          ) : (
            <ReplyContent content={p.content}
              className={cn('whitespace-pre-wrap break-words text-sm leading-relaxed', p.mine ? '' : 'text-inherit')} />
          )}

          {p.showMeta && (
            <div className={cn('mt-1 flex items-center justify-end gap-1 text-[11px]',
              p.deleted ? 'text-ink-400' : (p.mine ? p.bubble.mineMuted : 'text-ink-400'))}>
              {p.time}
              {p.showTicks && (p.seen
                ? <CheckCheck size={13} aria-label="Đã xem" />
                : <Check size={13} aria-label="Đã gửi" />)}
            </div>
          )}
        </div>
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
