'use client';

import { useEffect, useState } from 'react';
import { Star, Heart, Check, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Entry { status: string; score: number | null; progress: number; favorite: boolean }
const STATUSES = [
  { v: 'WATCHING', label: 'Đang xem' },
  { v: 'COMPLETED', label: 'Hoàn thành' },
  { v: 'PLANNING', label: 'Dự định' },
  { v: 'PAUSED', label: 'Tạm dừng' },
  { v: 'DROPPED', label: 'Bỏ dở' },
];

export default function EntryControls({ mediaId, max }: { mediaId: string; max?: number | null }) {
  const { user } = useAuth();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    api.get<Entry | null>(`/anime/me/entry/${mediaId}`).then((e) => setEntry(e)).catch(() => {}).finally(() => setLoaded(true));
  }, [user, mediaId]);

  async function save(patch: Partial<Entry>) {
    setSaving(true);
    try {
      const e = await api.put<Entry>(`/anime/me/entry/${mediaId}`, patch);
      setEntry(e);
    } catch {} finally { setSaving(false); }
  }
  async function remove() {
    setSaving(true);
    try { await api.del(`/anime/me/entry/${mediaId}`); setEntry(null); setOpen(false); } catch {} finally { setSaving(false); }
  }

  if (!loaded) return null;
  if (!user) return (
    <div className="card p-4 text-center text-sm text-ink-500">
      <a href="/login" className="font-medium text-brand-600 hover:underline">Đăng nhập</a> để chấm điểm & thêm vào danh sách.
    </div>
  );

  const statusLabel = STATUSES.find((s) => s.v === entry?.status)?.label;

  return (
    <div className="card space-y-3 p-4">
      {/* Trạng thái */}
      <div className="relative">
        <button onClick={() => setOpen((o) => !o)} disabled={saving}
          className="flex w-full items-center justify-between rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">
          <span>{entry ? statusLabel : '+ Thêm vào danh sách'}</span>
          <ChevronDown size={16} />
        </button>
        {open && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-900">
            {STATUSES.map((s) => (
              <button key={s.v} onClick={() => { save({ status: s.v }); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                {s.label} {entry?.status === s.v && <Check size={14} className="text-brand-600" />}
              </button>
            ))}
            {entry && <button onClick={remove} className="w-full border-t border-ink-100 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:border-ink-800 dark:hover:bg-red-950/30">Xoá khỏi danh sách</button>}
          </div>
        )}
      </div>

      {entry && (
        <>
          {/* Chấm điểm (1-5 sao) */}
          <div>
            <p className="mb-1 text-xs font-medium text-ink-500">Điểm của bạn</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => save({ score: entry.score === n ? null : n })} disabled={saving} aria-label={`${n} sao`}
                  className="text-2xl leading-none transition hover:scale-110">
                  <Star size={26} className={entry.score && n <= entry.score ? 'fill-amber-400 text-amber-400' : 'text-ink-300 dark:text-ink-600'} />
                </button>
              ))}
            </div>
          </div>

          {/* Tiến độ */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-500">Tiến độ</span>
            <input type="number" min={0} value={entry.progress}
              onChange={(e) => setEntry({ ...entry, progress: Number(e.target.value) })}
              onBlur={(e) => save({ progress: Number(e.target.value) })}
              className="input !w-20 !py-1 text-sm" />
            {max ? <span className="text-xs text-ink-400">/ {max}</span> : null}
          </div>

          {/* Yêu thích */}
          <button onClick={() => save({ favorite: !entry.favorite })} disabled={saving}
            className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium ${entry.favorite ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/30' : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300'}`}>
            <Heart size={15} className={entry.favorite ? 'fill-rose-500 text-rose-500' : ''} /> {entry.favorite ? 'Đã yêu thích' : 'Yêu thích'}
          </button>
        </>
      )}
    </div>
  );
}
