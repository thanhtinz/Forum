'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Shield, Pin, PinOff, Lock, Unlock, Star, StarOff, FolderInput, EyeOff, X } from 'lucide-react';
import {
  toggleThreadPin, toggleThreadLock, toggleThreadFeatured, moveThread, hideThread,
} from '@/app/(site)/forum/actions';

export interface ModForumOption { id: string; name: string }

export function ThreadModMenu({ threadId, pinned, locked, featured, forums }: {
  threadId: string; pinned: boolean; locked: boolean; featured: boolean; forums: ModForumOption[];
}) {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài thì đóng
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setOpen(false); setMoving(false); }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const run = (fn: () => Promise<{ error?: string } | void>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const r = await fn();
      if (r && 'error' in r && r.error) setError(r.error);
      else { setOpen(false); setMoving(false); }
    });
  };

  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="btn-outline !rounded-full gap-1.5 !px-3 !py-1.5 text-sm" aria-haspopup="menu" aria-expanded={open}>
        <Shield size={15} /> Điều hành
      </button>

      {open && (
        <div role="menu"
          className="card absolute right-0 z-30 mt-2 w-64 overflow-hidden p-1 shadow-card-hover">
          {!moving ? (
            <>
              <MenuItem icon={pinned ? <PinOff size={15} /> : <Pin size={15} />} label={pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                disabled={pending} onClick={() => run(() => toggleThreadPin(threadId))} />
              <MenuItem icon={locked ? <Unlock size={15} /> : <Lock size={15} />} label={locked ? 'Mở khoá trả lời' : 'Khoá trả lời'}
                disabled={pending} onClick={() => run(() => toggleThreadLock(threadId))} />
              <MenuItem icon={featured ? <StarOff size={15} /> : <Star size={15} />} label={featured ? 'Bỏ tinh hoa' : 'Đánh dấu tinh hoa'}
                disabled={pending} onClick={() => run(() => toggleThreadFeatured(threadId))} />
              <MenuItem icon={<FolderInput size={15} />} label="Chuyển chuyên mục…" disabled={pending} onClick={() => setMoving(true)} />
              <div className="my-1 border-t border-ink-100 dark:border-ink-800" />
              <MenuItem icon={<EyeOff size={15} />} label="Ẩn chủ đề" danger disabled={pending}
                onClick={() => run(() => hideThread(threadId), 'Ẩn chủ đề này khỏi diễn đàn?')} />
            </>
          ) : (
            <div className="p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Chuyển tới</span>
                <button type="button" onClick={() => setMoving(false)} className="text-ink-400 hover:text-ink-600"><X size={16} /></button>
              </div>
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {forums.map((f) => (
                  <button key={f.id} type="button" disabled={pending}
                    onClick={() => run(() => moveThread(threadId, f.id))}
                    className="w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-100 disabled:opacity-50 dark:hover:bg-ink-800">
                    {f.name}
                  </button>
                ))}
                {forums.length === 0 && <p className="px-3 py-2 text-sm text-ink-400">Không có mục nào khác.</p>}
              </div>
            </div>
          )}

          {error && <p className="px-3 py-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, disabled, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
        danger ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40' : 'hover:bg-ink-100 dark:hover:bg-ink-800'}`}>
      {icon} {label}
    </button>
  );
}
