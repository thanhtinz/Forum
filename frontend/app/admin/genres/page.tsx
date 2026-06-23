'use client';

import { useEffect, useState } from 'react';
import { Tag, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, Btn, Notice } from '@/components/admin/ui';

interface Genre { id: string; name: string; slug: string }

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [input, setInput] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<Genre[]>('/anime/genres').then(setGenres).catch((e: any) => setErr(e.message));
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const names = input.split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      for (const name of names) await api.post('/admin/anime/genres', { name });
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

  return (
    <div className="space-y-6">
      <PageHeader icon={<Tag size={20} />} title="Quản lý thể loại" desc="Thêm hoặc xoá thể loại hiển thị trên trang anime/manga/donghua/manhua." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-3">
        <form onSubmit={add} className="flex gap-2">
          <input
            className="input flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập tên thể loại, cách nhau bằng dấu phẩy (vd: Action, Huyền Huyễn, Truyện màu)"
          />
          <Btn type="submit" disabled={busy || !input.trim()}>
            <Plus size={15} /> Thêm
          </Btn>
        </form>
        <p className="text-xs text-ink-400">Có thể thêm nhiều thể loại một lúc, phân cách bằng dấu phẩy.</p>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-ink-500">{genres.length} thể loại</p>
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <span key={g.id} className="flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-sm dark:border-ink-700 dark:bg-ink-800">
              {g.name}
              <button onClick={() => del(g)} className="ml-0.5 text-ink-400 hover:text-rose-500 transition">
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
