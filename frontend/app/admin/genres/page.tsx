'use client';

import { useEffect, useState } from 'react';
import { Tag, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, Btn, Notice } from '@/components/admin/ui';

interface Genre { id: string; name: string; slug: string; types: string[] }

const MEDIA_TYPES = [
  { v: 'MANGA',   l: 'Manga (Nhật)' },
  { v: 'MANHUA',  l: 'Manhua (TQ)' },
  { v: 'DONGHUA', l: 'Donghua (TQ)' },
];

const TYPE_CLS: Record<string, string> = {
  MANGA:   'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400',
  MANHUA:  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  DONGHUA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
};

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [input, setInput] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<Genre[]>('/anime/genres').then(setGenres).catch((e: any) => setErr(e.message));
  }

  useEffect(() => { load(); }, []);

  function toggleType(t: string) {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const names = input.split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      for (const name of names) await api.post('/admin/anime/genres', { name, types: selectedTypes });
      setMsg(`Đã thêm ${names.length} thể loại ✓`);
      setInput('');
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function del(g: Genre) {
    if (!confirm(`Xoá thể loại "${g.name}"?`)) return;
    setErr(''); setMsg('');
    try { await api.del(`/admin/anime/genres/${g.id}`); load(); }
    catch (e: any) { setErr(e.message); }
  }

  const visible = filterType ? genres.filter((g) => g.types.includes(filterType)) : genres;

  return (
    <div className="space-y-6">
      <PageHeader icon={<Tag size={20} />} title="Quản lý thể loại" desc="Tạo thể loại và chọn loại truyện áp dụng." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-3">
        <form onSubmit={add} className="space-y-3">
          {/* Chọn type */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-500">Áp dụng cho loại nào?</p>
            <div className="flex flex-wrap gap-2">
              {MEDIA_TYPES.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => toggleType(t.v)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selectedTypes.includes(t.v)
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300'
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
            {selectedTypes.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-500">Chưa chọn loại → thể loại sẽ không hiển thị trên trang nào.</p>
            )}
          </div>
          {/* Nhập tên */}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tên thể loại, cách nhau bằng dấu phẩy (vd: Action, Huyền Huyễn)"
            />
            <Btn type="submit" disabled={busy || !input.trim()}><Plus size={15} /> Thêm</Btn>
          </div>
        </form>
      </Card>

      <Card>
        {/* Filter tabs */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[{ v: '', l: `Tất cả (${genres.length})` }, ...MEDIA_TYPES.map((t) => ({ v: t.v, l: `${t.l} (${genres.filter((g) => g.types.includes(t.v)).length})` }))].map((t) => (
            <button key={t.v} onClick={() => setFilterType(t.v)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${filterType === t.v ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {visible.map((g) => (
            <span key={g.id} className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-sm dark:border-ink-700 dark:bg-ink-800">
              {g.name}
              <span className="flex gap-0.5">
                {g.types.map((t) => (
                  <span key={t} className={`rounded px-1 py-0.5 text-[10px] font-medium ${TYPE_CLS[t] ?? ''}`}>{t}</span>
                ))}
              </span>
              <button onClick={() => del(g)} className="text-ink-400 hover:text-rose-500 transition">
                <Trash2 size={12} />
              </button>
            </span>
          ))}
          {visible.length === 0 && <p className="text-sm text-ink-400">Chưa có thể loại nào.</p>}
        </div>
      </Card>
    </div>
  );
}
