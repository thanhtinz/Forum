'use client';

import { useEffect, useState } from 'react';
import { Tv, Search, Loader2, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface Work { id: string; slug: string; title: string; coverUrl?: string | null; seasonYear?: number | null; format?: string | null; avgScore: number }
interface Genre { id: string; slug: string; name: string }

const FORMATS = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'];
const EMPTY_FORM = {
  title: '', titleEnglish: '', titleNative: '',
  status: 'RELEASING', format: '',
  season: '', seasonYear: '', episodes: '', duration: '',
  description: '', coverUrl: '', trailerUrl: '',
};

export default function AdminAnimePage() {
  const [list, setList] = useState<Work[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [listSearch, setListSearch] = useState('');

  function load() {
    const qs = new URLSearchParams({ type: 'DONGHUA', limit: '60' });
    if (listSearch.trim()) qs.set('search', listSearch.trim());
    api.get<{ data: Work[] }>(`/admin/anime?${qs}`).then((r) => setList(r.data || [])).catch((e: any) => setErr(e.message));
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { api.get<Genre[]>('/anime/genres?type=DONGHUA').then(setGenres).catch(() => {}); }, []);

  async function createManual() {
    if (!form.title.trim()) { setErr('Nhập tên phim'); return; }
    setCreating(true); setErr(''); setMsg('');
    try {
      const payload: any = { title: form.title.trim(), type: 'DONGHUA', status: form.status, genreNames: selectedGenres };
      if (form.titleEnglish.trim()) payload.titleEnglish = form.titleEnglish.trim();
      if (form.titleNative.trim()) payload.titleNative = form.titleNative.trim();
      if (form.format) payload.format = form.format;
      if (form.season) payload.season = form.season;
      if (form.seasonYear) payload.seasonYear = Number(form.seasonYear);
      if (form.episodes) payload.episodes = Number(form.episodes);
      if (form.duration) payload.duration = Number(form.duration);
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.coverUrl.trim()) payload.coverUrl = form.coverUrl.trim();
      if (form.trailerUrl.trim()) payload.trailerUrl = form.trailerUrl.trim();
      await api.post('/admin/anime', payload);
      setMsg('Đã tạo ✓');
      setForm(EMPTY_FORM);
      setSelectedGenres([]);
      setCreateOpen(false);
      load();
    } catch (e: any) { setErr(e.message); } finally { setCreating(false); }
  }

  async function del(w: Work) {
    if (!confirm(`Xoá "${w.title}"?`)) return;
    try { await api.post(`/admin/anime/${w.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  function set(k: keyof typeof EMPTY_FORM, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  function toggleGenre(name: string) { setSelectedGenres((p) => p.includes(name) ? p.filter((x) => x !== name) : [...p, name]); }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Tv size={20} />} title="Hoạt hình (Donghua)" desc="Quản lý phim hoạt hình Trung Quốc." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      {/* Create — collapsible */}
      <Card className="space-y-4">
        <button className="flex w-full items-center justify-between" onClick={() => setCreateOpen((o) => !o)}>
          <span className="flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
            <Plus size={15} /> Thêm phim mới
          </span>
          {createOpen ? <ChevronUp size={18} className="text-ink-400" /> : <ChevronDown size={18} className="text-ink-400" />}
        </button>

        {createOpen && (
          <div className="space-y-4 border-t border-ink-100 pt-4 dark:border-ink-800">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Tên chính *">
                <input className="input w-full" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Tên hiển thị..." />
              </Field>
              <Field label="Tên tiếng Anh">
                <input className="input w-full" value={form.titleEnglish} onChange={(e) => set('titleEnglish', e.target.value)} placeholder="English title" />
              </Field>
              <Field label="Tên gốc">
                <input className="input w-full" value={form.titleNative} onChange={(e) => set('titleNative', e.target.value)} placeholder="原名" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Trạng thái">
                <select className="input w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="RELEASING">Đang phát hành</option>
                  <option value="FINISHED">Hoàn thành</option>
                  <option value="NOT_YET_RELEASED">Sắp ra mắt</option>
                  <option value="HIATUS">Tạm ngưng</option>
                  <option value="CANCELLED">Đã huỷ</option>
                </select>
              </Field>
              <Field label="Định dạng">
                <select className="input w-full" value={form.format} onChange={(e) => set('format', e.target.value)}>
                  <option value="">— Chọn —</option>
                  {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Mùa">
                <select className="input w-full" value={form.season} onChange={(e) => set('season', e.target.value)}>
                  <option value="">— Chọn —</option>
                  <option value="WINTER">Đông</option>
                  <option value="SPRING">Xuân</option>
                  <option value="SUMMER">Hạ</option>
                  <option value="FALL">Thu</option>
                </select>
              </Field>
              <Field label="Năm">
                <input type="number" className="input w-full" value={form.seasonYear} onChange={(e) => set('seasonYear', e.target.value)} placeholder="2024" min="1950" max="2099" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Số tập">
                <input type="number" className="input w-full" value={form.episodes} onChange={(e) => set('episodes', e.target.value)} placeholder="12" min="1" />
              </Field>
              <Field label="Thời lượng (phút/tập)">
                <input type="number" className="input w-full" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="24" min="1" />
              </Field>
              <Field label="Ảnh bìa (URL)">
                <input className="input w-full" value={form.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} placeholder="https://..." />
              </Field>
            </div>

            <Field label="Trailer (YouTube URL)">
              <input className="input w-full" value={form.trailerUrl} onChange={(e) => set('trailerUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </Field>

            <Field label="Mô tả">
              <textarea className="input w-full" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Tóm tắt nội dung..." />
            </Field>

            {genres.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-500">Thể loại</p>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <button key={g.id} type="button" onClick={() => toggleGenre(g.name)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${selectedGenres.includes(g.name) ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300'}`}>
                      {g.name}
                    </button>
                  ))}
                </div>
                {selectedGenres.length > 0 && <p className="mt-1.5 text-[11px] text-ink-400">Đã chọn: {selectedGenres.join(', ')}</p>}
              </div>
            )}

            <div className="flex justify-end border-t border-ink-100 pt-3 dark:border-ink-800">
              <Btn onClick={createManual} disabled={creating}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : null} Tạo
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {/* List */}
      <div className="space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex items-center gap-1 rounded-lg border border-ink-200 px-2 dark:border-ink-700">
          <Search size={15} className="text-ink-400" />
          <input value={listSearch} onChange={(e) => setListSearch(e.target.value)} placeholder="Tìm phim…" className="w-full bg-transparent py-1.5 text-sm outline-none" />
        </form>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Danh sách ({list.length})</p>
        {list.length === 0 && <Card><Empty icon={<Tv size={28} />} title="Chưa có dữ liệu" /></Card>}
        {list.map((w) => (
          <Card key={w.id}>
            <div className="flex items-center gap-3">
              {w.coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                && <img src={w.coverUrl} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <a href={`/movie/detail?slug=${w.slug}`} target="_blank" className="font-semibold hover:text-brand-600">{w.title}</a>
                <p className="mt-0.5 text-xs text-ink-500">{w.format || 'Donghua'}{w.seasonYear ? ` · ${w.seasonYear}` : ''}{w.avgScore > 0 ? ` · ★ ${w.avgScore.toFixed(1)}` : ''}</p>
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
