'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Search, Trash2, ExternalLink, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, Notice, Btn, Empty } from '@/components/admin/ui';

interface Work {
  id: string;
  slug: string;
  title: string;
  coverUrl?: string | null;
  format?: string | null;
  status: string;
  avgScore: number;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  PUBLISHED: 'Đã đăng',
  REJECTED: 'Từ chối',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const FORMAT_LABEL: Record<string, string> = {
  MANHUA: 'Manhua',
  MANGA: 'Manga',
  MANHWA: 'Manhwa',
  NOVEL: 'Tiểu thuyết',
};

export default function AdminComicPage() {
  const [list, setList] = useState<Work[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [busy, setBusy] = useState('');

  function load() {
    const qs = new URLSearchParams({ type: 'MANHUA', limit: '100' });
    if (listSearch.trim()) qs.set('search', listSearch.trim());
    api.get<{ data: Work[] }>(`/admin/anime?${qs}`).then((r) => setList(r.data || [])).catch((e: any) => setErr(e.message));
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function moderate(id: string, action: 'approve' | 'reject') {
    setBusy(`${id}-${action}`); setErr(''); setMsg('');
    try {
      await api.post(`/creator/admin/series/${id}/moderate`, { action });
      setMsg(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} truyện ✓`);
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function del(w: Work) {
    if (!confirm(`Xoá "${w.title}"?`)) return;
    try { await api.post(`/admin/anime/${w.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<BookOpen size={20} />} title="Truyện tranh" desc="Xem, duyệt và xoá truyện tranh (Manhua / Manga / Manhwa / Novel)." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <div className="space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex items-center gap-1 rounded-lg border border-ink-200 px-2 dark:border-ink-700">
          <Search size={15} className="text-ink-400" />
          <input value={listSearch} onChange={(e) => setListSearch(e.target.value)} placeholder="Tìm truyện…" className="w-full bg-transparent py-1.5 text-sm outline-none" />
        </form>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Danh sách ({list.length})</p>

        {list.length === 0 && <Card><Empty icon={<BookOpen size={28} />} title="Chưa có dữ liệu" /></Card>}

        {list.map((w) => (
          <Card key={w.id}>
            <div className="flex items-center gap-3">
              {w.coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                && <img src={w.coverUrl} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{w.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[w.status] ?? STATUS_COLOR.DRAFT}`}>
                    {STATUS_LABEL[w.status] ?? w.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">
                  {FORMAT_LABEL[w.format ?? ''] ?? w.format ?? 'Truyện tranh'}
                  {w.avgScore > 0 ? ` · ★ ${w.avgScore.toFixed(1)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <a href={`/comic/detail?slug=${w.slug}`} target="_blank" rel="noopener noreferrer">
                  <Btn size="sm" variant="outline"><ExternalLink size={13} /> Xem</Btn>
                </a>
                {w.status === 'PENDING' && (
                  <>
                    <Btn size="sm" onClick={() => moderate(w.id, 'approve')} disabled={busy === `${w.id}-approve`}>
                      {busy === `${w.id}-approve` ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Duyệt
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => moderate(w.id, 'reject')} disabled={busy === `${w.id}-reject`}>
                      {busy === `${w.id}-reject` ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} Từ chối
                    </Btn>
                  </>
                )}
                <Btn variant="danger" size="sm" onClick={() => del(w)}><Trash2 size={14} /></Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
