'use client';

import { useEffect, useState } from 'react';
import { Tv, Search, Download, Loader2, Trash2, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface Work { id: string; type: string; slug: string; title: string; coverUrl?: string | null; seasonYear?: number | null; format?: string | null; avgScore: number }
interface Candidate { anilistId: number; title: string; cover?: string | null; format?: string | null; year?: number | null; score?: number | null }

export default function AdminAnime() {
  const [list, setList] = useState<Work[]>([]);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  // import
  const [impType, setImpType] = useState<'ANIME' | 'MANGA'>('ANIME');
  const [impQuery, setImpQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  // manual
  const [form, setForm] = useState({ title: '', type: 'ANIME', status: 'FINISHED' });
  // bộ lọc danh sách đã có
  const [tab, setTab] = useState(''); // '' | 'ANIME' | 'MANGA,LIGHT_NOVEL'
  const [listSearch, setListSearch] = useState('');

  function load() {
    const qs = new URLSearchParams({ limit: '60' });
    if (tab) qs.set('type', tab);
    if (listSearch.trim()) qs.set('search', listSearch.trim());
    api.get<{ data: Work[] }>(`/admin/anime?${qs}`).then((r) => setList(r.data || [])).catch((e) => setErr(e.message));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  async function search() {
    if (!impQuery.trim()) return;
    setSearching(true); setErr(''); setCandidates([]);
    try { setCandidates(await api.get<Candidate[]>(`/admin/anime/anilist/search?type=${impType}&q=${encodeURIComponent(impQuery.trim())}`)); }
    catch (e: any) { setErr(e.message); } finally { setSearching(false); }
  }
  async function importOne(anilistId: number) {
    setImportingId(anilistId); setErr(''); setMsg('');
    try {
      const r = await api.post<{ title: string }>('/admin/anime/anilist/import', { anilistId });
      setMsg(`Đã import "${r.title}" ✓`); load();
    } catch (e: any) { setErr(e.message); } finally { setImportingId(null); }
  }
  async function createManual() {
    if (!form.title.trim()) { setErr('Nhập tên'); return; }
    setErr(''); setMsg('');
    try { await api.post('/admin/anime', form); setMsg('Đã tạo ✓'); setForm({ title: '', type: 'ANIME', status: 'FINISHED' }); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function del(w: Work) {
    if (!confirm(`Xoá "${w.title}"?`)) return;
    try { await api.post(`/admin/anime/${w.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Tv size={20} />} title="Anime / Manga / Manhua / Donghua" desc="Quản lý cơ sở dữ liệu. Import nhanh từ AniList." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-4">
        <SectionTitle hint="Tìm trên AniList rồi bấm Import — tự kéo poster, mô tả, thể loại, studio, nhân vật, seiyuu, ê-kíp.">Import từ AniList</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto" value={impType} onChange={(e) => setImpType(e.target.value as any)}>
            <option value="ANIME">Anime</option>
            <option value="MANGA">Manga / Light Novel</option>
          </select>
          <div className="flex min-w-[200px] flex-1 items-center gap-1 rounded-lg border border-ink-200 px-2 dark:border-ink-700">
            <Search size={16} className="text-ink-400" />
            <input className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Tên anime/manga…" value={impQuery}
              onChange={(e) => setImpQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          </div>
          <Btn onClick={search} disabled={searching}>{searching ? <Loader2 size={15} className="animate-spin" /> : 'Tìm'}</Btn>
        </div>
        {candidates.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {candidates.map((c) => (
              <div key={c.anilistId} className="flex items-center gap-3 rounded-lg border border-ink-200/70 p-2 dark:border-ink-700">
                {c.cover && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.cover} alt="" className="h-16 w-12 shrink-0 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-ink-400">{c.format || ''} {c.year || ''} {c.score ? `· ★${(c.score / 10).toFixed(1)}` : ''}</p>
                </div>
                <Btn size="sm" onClick={() => importOne(c.anilistId)} disabled={importingId === c.anilistId}>
                  {importingId === c.anilistId ? <Loader2 size={14} className="animate-spin" /> : <><Download size={14} /> Import</>}
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <SectionTitle>Tạo thủ công</SectionTitle>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Tên"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Loại"><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="ANIME">Anime</option><option value="DONGHUA">Donghua</option><option value="MANGA">Manga</option><option value="MANHUA">Manhua</option></select></Field>
          <Field label="Trạng thái"><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="FINISHED">Hoàn thành</option><option value="RELEASING">Đang phát hành</option><option value="NOT_YET_RELEASED">Sắp ra mắt</option></select></Field>
          <Btn onClick={createManual}>Tạo</Btn>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[{ v: '', l: 'Tất cả' }, { v: 'ANIME', l: 'Anime' }, { v: 'DONGHUA', l: 'Donghua' }, { v: 'MANGA', l: 'Manga' }, { v: 'MANHUA', l: 'Manhua' }].map((t) => (
            <button key={t.v} onClick={() => setTab(t.v)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === t.v ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{t.l}</button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="ml-auto flex min-w-[180px] flex-1 items-center gap-1 rounded-lg border border-ink-200 px-2 dark:border-ink-700 sm:max-w-xs">
            <Search size={15} className="text-ink-400" />
            <input value={listSearch} onChange={(e) => setListSearch(e.target.value)} placeholder="Tìm trong danh sách…" className="w-full bg-transparent py-1.5 text-sm outline-none" />
          </form>
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Đã có ({list.length})</h2>
        {list.length === 0 && <Card><Empty icon={<Tv size={28} />} title="Chưa có dữ liệu" /></Card>}
        {list.map((w) => (
          <Card key={w.id}>
            <div className="flex items-center gap-3">
              {w.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={w.coverUrl} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <a href={`/anime/detail?slug=${w.slug}`} target="_blank" className="font-semibold hover:text-brand-600">{w.title}</a>
                <p className="mt-0.5 text-xs text-ink-500">{w.type} · {w.format || ''} {w.seasonYear || ''} {w.avgScore > 0 ? <span className="inline-flex items-center gap-0.5 text-amber-600"><Star size={11} /> {w.avgScore.toFixed(1)}</span> : ''}</p>
              </div>
              <a href={`/admin/anime/edit?id=${w.id}`}><Btn size="sm">Sửa</Btn></a>
              <Btn variant="danger" size="sm" onClick={() => del(w)}><Trash2 size={14} /></Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
