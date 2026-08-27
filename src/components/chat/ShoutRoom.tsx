'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useCallback } from 'react';
import { Send, Reply, X, Trash2, Users } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { sendShout, removeShout, type ShoutState } from '@/app/(site)/chat/actions';
import { SHOUT_MAX_LEN } from '@/lib/shout-const';

interface Shout {
  id: string;
  content: string;
  createdAt: string;
  deleted: boolean;
  user: { username: string | null; name: string | null; image: string | null; level: number; role: string };
  replyTo: { id: string; username: string | null; content: string } | null;
}
interface Here { username: string | null; name: string | null; image: string | null; level: number }

/** Nhịp nạp lại. Phòng chat cũ để 10–15 giây; 5 giây là đủ nhanh mà không nặng. */
const POLL_MS = 5000;

/** [12:34] — dấu thời gian đứng đầu mỗi dòng, đúng kiểu chatbox ngày xưa. */
function clock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Màu tên theo vai trò — ban quản trị đỏ, điều hành xanh lá, còn lại xanh dương. */
function nameClass(role: string): string {
  if (role === 'ADMIN') return 'text-red-600 dark:text-red-400';
  if (role === 'MODERATOR') return 'text-emerald-600 dark:text-emerald-400';
  return 'text-brand-700 dark:text-brand-300';
}

export function ShoutRoom({ initial, initialHere, meUsername, meRole }: {
  initial: Shout[];
  initialHere: Here[];
  /** Tên đăng nhập của chính mình — để biết câu nào tự gỡ được. */
  meUsername: string | null;
  meRole: string;
}) {
  const [items, setItems] = useState<Shout[]>(initial);
  const [here, setHere] = useState<Here[]>(initialHere);
  const [replyTo, setReplyTo] = useState<Shout | null>(null);
  const [state, action, pending] = useActionState<ShoutState, FormData>(sendShout, {});
  const formRef = useRef<HTMLFormElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Chỉ tự cuộn khi người dùng đang ở đáy — đang đọc lại chuyện cũ thì để yên. */
  const atBottom = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/chat', { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      setItems(data.messages);
      setHere(data.here);
    } catch {
      /* mất mạng chốc lát thì lần sau nạp lại, không cần báo gì */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Gửi xong: dọn ô nhập, bỏ trích dẫn, nạp lại ngay cho khỏi phải chờ nhịp sau.
  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setReplyTo(null);
    inputRef.current?.focus();
    load();
  }, [state, load]);

  useEffect(() => {
    if (atBottom.current && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [items]);

  const onScroll = () => {
    const el = boxRef.current;
    if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  // Nút gỡ chỉ là gợi ý ở giao diện; quyền thật vẫn do server action quyết.
  const canRemove = (s: Shout) =>
    !s.deleted &&
    (meRole === 'ADMIN' || meRole === 'MODERATOR' || (!!meUsername && s.user.username === meUsername));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <section className="card flex min-w-0 flex-col overflow-hidden">
        <header className="retro-head flex items-center gap-2 px-3 py-2.5 sm:px-4">
          <h2 className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide">Phòng chat chung</h2>
          <span className="retro-sub opacity-70">{items.length} câu gần nhất</span>
        </header>

        {/* Phòng vắng thì các câu vẫn nằm sát đáy, ngay trên ô nhập — chatbox
            ngày xưa luôn dồn xuống dưới chứ không treo lơ lửng ở đỉnh khung. */}
        <div ref={boxRef} onScroll={onScroll} className="flex h-[60vh] min-h-72 flex-col overflow-y-auto">
          <div className="retro-stripe mt-auto">
          {items.length === 0 ? (
            <p className="p-10 text-center text-sm text-ink-400">Phòng đang vắng. Nói câu đầu tiên đi.</p>
          ) : (
            items.map((s) => (
              <div key={s.id} className="group flex items-start gap-2 px-3 py-1.5 hover:bg-ink-50 sm:px-4 dark:hover:bg-ink-800/50">
                <span className="retro-sub shrink-0 pt-0.5 tabular-nums text-ink-400">[{clock(s.createdAt)}]</span>

                <p className="min-w-0 flex-1 break-words text-sm leading-relaxed">
                  <Link href={`/u/${s.user.username ?? ''}`} className={`font-bold hover:underline ${nameClass(s.user.role)}`}>
                    {s.user.name ?? s.user.username}
                  </Link>
                  <span className="retro-sub text-ink-400"> Lv{s.user.level}</span>
                  <span className="text-ink-400">: </span>

                  {s.replyTo && (
                    <span className="retro-sub mr-1 rounded bg-ink-100 px-1.5 py-0.5 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
                      ↪ @{s.replyTo.username ?? 'ai đó'}
                      {s.replyTo.content ? `: ${s.replyTo.content.slice(0, 40)}` : ' (đã gỡ)'}
                    </span>
                  )}

                  {s.deleted ? (
                    <em className="text-ink-400">câu này đã bị gỡ</em>
                  ) : (
                    <span className="text-ink-800 dark:text-ink-100">{s.content}</span>
                  )}
                </p>

                {!s.deleted && (
                  <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" title="Trả lời câu này"
                      onClick={() => { setReplyTo(s); inputRef.current?.focus(); }}
                      className="grid size-6 place-items-center rounded text-ink-400 hover:bg-ink-200 hover:text-brand-600 dark:hover:bg-ink-700">
                      <Reply size={13} />
                    </button>
                    {canRemove(s) && (
                      <button type="button" title="Gỡ câu này"
                        onClick={async () => { await removeShout(s.id); load(); }}
                        className="grid size-6 place-items-center rounded text-ink-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                )}
              </div>
            ))
          )}
          </div>
        </div>

        <div className="retro-rule border-t border-ink-100 p-2.5 sm:p-3 dark:border-ink-800">
          {replyTo && (
            <p className="retro-sub mb-1.5 flex items-center gap-1.5 rounded bg-ink-100 px-2 py-1 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
              ↪ Trả lời <b>@{replyTo.user.username}</b>
              <span className="truncate">{replyTo.content.slice(0, 50)}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="ml-auto shrink-0 hover:text-red-600" title="Bỏ trích dẫn">
                <X size={13} />
              </button>
            </p>
          )}

          <ActionForm ref={formRef} action={action} className="flex items-center gap-2">
            <input type="hidden" name="replyToId" value={replyTo?.id ?? ''} />
            <input ref={inputRef} name="content" autoComplete="off" maxLength={SHOUT_MAX_LEN}
              placeholder="Nói gì đó với cả phòng…" className="input flex-1 !py-2" />
            <button type="submit" disabled={pending} className="btn-primary shrink-0 !px-3 !py-2 disabled:opacity-60">
              <Send size={15} /> Gửi
            </button>
          </ActionForm>

          {state.error && <p className="mt-1.5 text-xs font-medium text-red-600">{state.error}</p>}
        </div>
      </section>

      <aside className="card h-fit p-3.5">
        <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-bold">
          <Users size={15} className="text-emerald-500" /> Đang trong phòng
          <span className="chip ml-auto bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50">{here.length}</span>
        </h3>
        {here.length === 0 ? (
          <p className="retro-sub text-ink-400">Chưa có ai khác.</p>
        ) : (
          <ul className="space-y-1.5">
            {here.map((u) => (
              <li key={u.username} className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {u.image
                  ? <img src={u.image} alt="" className="size-7 rounded-full object-cover" />
                  : <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">{(u.name ?? u.username ?? 'U')[0]?.toUpperCase()}</span>}
                <Link href={`/u/${u.username ?? ''}`} className="min-w-0 flex-1 truncate text-sm hover:text-brand-600">
                  {u.name ?? u.username}
                </Link>
                <span className="retro-sub shrink-0 text-ink-400">Lv{u.level}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
