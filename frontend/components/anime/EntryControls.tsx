'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Entry { favorite: boolean }

export default function EntryControls({ mediaId }: { mediaId: string; max?: number | null }) {
  const { user } = useAuth();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<Entry | null>(`/anime/me/entry/${mediaId}`).then(setEntry).catch(() => {});
  }, [user, mediaId]);

  async function toggleFav() {
    if (!user) { window.location.href = '/login'; return; }
    const next = { favorite: !(entry?.favorite) };
    setEntry(next);
    setSaving(true);
    try { await api.put(`/anime/me/entry/${mediaId}`, next); } catch {} finally { setSaving(false); }
  }

  const fav = entry?.favorite ?? false;

  return (
    <button onClick={toggleFav} disabled={saving}
      className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition ${fav ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/30' : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300'}`}>
      <Heart size={16} className={fav ? 'fill-rose-500 text-rose-500' : ''} />
      {fav ? 'Đã yêu thích' : 'Yêu thích'}
    </button>
  );
}
