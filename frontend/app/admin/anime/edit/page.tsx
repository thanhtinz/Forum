'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tv, Save, Plus, Trash2, ArrowLeft, Film, BookOpen, Loader2, Link as LinkIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface Ep { id: string; number: number; title?: string | null; videoUrl?: string | null; thumbnail?: string | null; duration?: number | null }
interface Ch { id: string; number: number; title?: string | null; content?: string | null; pages: string[] }

function EditInner() {
  const id = useSearchParams().get('id') || '';
  const [w, setW] = useState<any>(null);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  function load() { api.get<any>(`/admin/anime/${id}`).then(setW).catch((e) => setErr(e.message)); }
  useEffect(() => { if (id) load(); }, [id]);

  const set = (k: string, v: any) => setW((s: any) => ({ ...s, [k]: v }));
  async function saveInfo() {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/anime/${id}`, {
        title: w.title, titleEnglish: w.titleEnglish, titleNative: w.titleNative, type: w.type, status: w.status,
        format: w.format, season: w.season, seasonYear: w.seasonYear, episodes: w.episodes, duration: w.duration,
        chapters: w.chapters, volumes: w.volumes, source: w.source, trailerUrl: w.trailerUrl,
        coverUrl: w.coverUrl, bannerUrl: w.bannerUrl, description: w.description, isAdult: w.isAdult,
        genreNames: (w._genres ?? (w.genres || []).map((g: any) => g.name).join(', ')).split(',').map((x: string) => x.trim()).filter(Boolean),
      });
      setMsg('Đã lưu thông tin ✓'); load();
    } catch (e: any) { setErr(e.message); }
  }

  if (err && !w) return <Notice kind="error">{err}</Notice>;
  if (!w) return <p className="p-10 text-center text-ink-500">Đang tải…</p>;
  const isStory = w.type === 'MANGA' || w.type === 'LIGHT_NOVEL';

  return (
    <div className="space-y-6">
      <PageHeader icon={<Tv size={20} />} title={`Sửa: ${w.title}`} desc="Chỉnh sửa thông tin và quản lý tập phim / chương."
        actions={<a href="/admin/anime" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Quay lại</a>} />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-3">
        <SectionTitle>Thông tin</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tên chính"><input className="input" value={w.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Tên tiếng Anh"><input className="input" value={w.titleEnglish || ''} onChange={(e) => set('titleEnglish', e.target.value)} /></Field>
          <Field label="Tên gốc (Nhật)"><input className="input" value={w.titleNative || ''} onChange={(e) => set('titleNative', e.target.value)} /></Field>
          <Field label="Loại"><select className="input" value={w.type} onChange={(e) => set('type', e.target.value)}><option value="ANIME">Anime</option><option value="MANGA">Manga</option><option value="LIGHT_NOVEL">Light Novel</option></select></Field>
          <Field label="Trạng thái"><select className="input" value={w.status} onChange={(e) => set('status', e.target.value)}><option value="RELEASING">Đang phát hành</option><option value="FINISHED">Hoàn thành</option><option value="NOT_YET_RELEASED">Sắp ra mắt</option><option value="HIATUS">Tạm ngưng</option><option value="CANCELLED">Đã huỷ</option></select></Field>
          <Field label="Định dạng"><input className="input" value={w.format || ''} onChange={(e) => set('format', e.target.value)} placeholder="TV / MOVIE / MANGA…" /></Field>
          <Field label="Mùa"><select className="input" value={w.season || ''} onChange={(e) => set('season', e.target.value || null)}><option value="">—</option><option value="WINTER">Đông</option><option value="SPRING">Xuân</option><option value="SUMMER">Hạ</option><option value="FALL">Thu</option></select></Field>
          <Field label="Năm"><input type="number" className="input" value={w.seasonYear || ''} onChange={(e) => set('seasonYear', e.target.value)} /></Field>
          <Field label="Số tập (tổng)"><input type="number" className="input" value={w.episodes ?? ''} onChange={(e) => set('episodes', e.target.value)} /></Field>
          <Field label="Thời lượng (phút)"><input type="number" className="input" value={w.duration ?? ''} onChange={(e) => set('duration', e.target.value)} /></Field>
          <Field label="Số chương (tổng)"><input type="number" className="input" value={w.chapters ?? ''} onChange={(e) => set('chapters', e.target.value)} /></Field>
          <Field label="Số volume"><input type="number" className="input" value={w.volumes ?? ''} onChange={(e) => set('volumes', e.target.value)} /></Field>
          <Field label="Nguồn"><input className="input" value={w.source || ''} onChange={(e) => set('source', e.target.value)} /></Field>
          <Field label="Trailer URL"><input className="input" value={w.trailerUrl || ''} onChange={(e) => set('trailerUrl', e.target.value)} /></Field>
          <Field label="Ảnh bìa (cover)"><input className="input" value={w.coverUrl || ''} onChange={(e) => set('coverUrl', e.target.value)} /></Field>
          <Field label="Ảnh banner"><input className="input" value={w.bannerUrl || ''} onChange={(e) => set('bannerUrl', e.target.value)} /></Field>
        </div>
        <Field label="Thể loại (phân cách bằng dấu phẩy)"><input className="input" defaultValue={(w.genres || []).map((g: any) => g.name).join(', ')} onChange={(e) => set('_genres', e.target.value)} /></Field>
        <Field label="Mô tả"><textarea className="input min-h-[120px]" value={w.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!w.isAdult} onChange={(e) => set('isAdult', e.target.checked)} /> Nội dung 18+</label>
        <Btn onClick={saveInfo}><Save size={15} /> Lưu thông tin</Btn>
      </Card>

      {w.type === 'ANIME'
        ? <EpisodeManager mediaId={id} episodes={w.episodeList || []} onChange={load} setErr={setErr} />
        : <ChapterManager mediaId={id} chapters={w.chapterList || []} isNovel={w.type === 'LIGHT_NOVEL'} onChange={load} setErr={setErr} />}
    </div>
  );
}

function EpisodeManager({ mediaId, episodes, onChange, setErr }: { mediaId: string; episodes: Ep[]; onChange: () => void; setErr: (s: string) => void }) {
  const [add, setAdd] = useState({ number: '', title: '', videoUrl: '', thumbnail: '', duration: '' });
  const [embedInput, setEmbedInput] = useState('');
  const [embedBusy, setEmbedBusy] = useState(false);
  const [embedCands, setEmbedCands] = useState<string[]>([]);
  async function create() {
    if (!add.number) { setErr('Nhập số tập'); return; }
    try { await api.post(`/admin/anime/${mediaId}/episode`, add); setAdd({ number: '', title: '', videoUrl: '', thumbnail: '', duration: '' }); onChange(); }
    catch (e: any) { setErr(e.message); }
  }
  async function getEmbed() {
    if (!embedInput.trim()) return;
    setEmbedBusy(true); setErr(''); setEmbedCands([]);
    try {
      const r = await api.post<{ candidates: string[] }>('/admin/anime/extract-embed', { input: embedInput });
      setEmbedCands(r.candidates);
      if (r.candidates[0]) setAdd((s) => ({ ...s, videoUrl: r.candidates[0] }));
    } catch (e: any) { setErr(e.message); } finally { setEmbedBusy(false); }
  }
  return (
    <Card className="space-y-3">
      <SectionTitle hint="Mỗi tập có link xem (embed YouTube/iframe/mp4).">Tập phim ({episodes.length})</SectionTitle>

      <div className="rounded-lg border border-dashed border-ink-300 p-3 dark:border-ink-600">
        <p className="mb-1.5 text-xs font-medium text-ink-500">Lấy embed tự động — dán link trang tập (vd: vuighe.live/…) hoặc dán nguyên mã &lt;iframe&gt;</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input flex-1" placeholder="https://vuighe.live/… hoặc <iframe src=…>" value={embedInput} onChange={(e) => setEmbedInput(e.target.value)} />
          <Btn onClick={getEmbed} disabled={embedBusy}>{embedBusy ? <Loader2 size={15} className="animate-spin" /> : <><LinkIcon size={15} /> Lấy embed</>}</Btn>
        </div>
        {embedCands.length > 0 && (
          <div className="mt-2 space-y-1">
            {embedCands.map((c) => (
              <button key={c} onClick={() => setAdd((s) => ({ ...s, videoUrl: c }))}
                className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${add.videoUrl === c ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'bg-ink-100 dark:bg-ink-800'}`}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
        <input className="input sm:col-span-1" placeholder="Tập #" value={add.number} onChange={(e) => setAdd({ ...add, number: e.target.value })} />
        <input className="input sm:col-span-2" placeholder="Tiêu đề" value={add.title} onChange={(e) => setAdd({ ...add, title: e.target.value })} />
        <input className="input sm:col-span-2" placeholder="Link video / embed" value={add.videoUrl} onChange={(e) => setAdd({ ...add, videoUrl: e.target.value })} />
        <Btn onClick={create}><Plus size={15} /> Thêm</Btn>
      </div>
      <div className="space-y-2">
        {episodes.length === 0 && <Empty icon={<Film size={24} />} title="Chưa có tập nào" />}
        {episodes.map((ep) => <EpisodeRow key={ep.id} ep={ep} onChange={onChange} setErr={setErr} />)}
      </div>
    </Card>
  );
}
function EpisodeRow({ ep, onChange, setErr }: { ep: Ep; onChange: () => void; setErr: (s: string) => void }) {
  const [v, setV] = useState({ number: String(ep.number), title: ep.title || '', videoUrl: ep.videoUrl || '' });
  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-ink-200/70 p-2 dark:border-ink-700 sm:grid-cols-7">
      <input className="input sm:col-span-1" value={v.number} onChange={(e) => setV({ ...v, number: e.target.value })} />
      <input className="input sm:col-span-2" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Tiêu đề" />
      <input className="input sm:col-span-3" value={v.videoUrl} onChange={(e) => setV({ ...v, videoUrl: e.target.value })} placeholder="Link video" />
      <div className="flex gap-1">
        <Btn size="sm" onClick={async () => { try { await api.patch(`/admin/anime/episode/${ep.id}`, v); onChange(); } catch (e: any) { setErr(e.message); } }}><Save size={14} /></Btn>
        <Btn size="sm" variant="danger" onClick={async () => { if (confirm('Xoá tập?')) { await api.post(`/admin/anime/episode/${ep.id}/delete`); onChange(); } }}><Trash2 size={14} /></Btn>
      </div>
    </div>
  );
}

function ChapterManager({ mediaId, chapters, isNovel, onChange, setErr }: { mediaId: string; chapters: Ch[]; isNovel: boolean; onChange: () => void; setErr: (s: string) => void }) {
  const [add, setAdd] = useState({ number: '', title: '', pages: '', content: '' });
  async function create() {
    if (!add.number) { setErr('Nhập số chương'); return; }
    try { await api.post(`/admin/anime/${mediaId}/chapter`, add); setAdd({ number: '', title: '', pages: '', content: '' }); onChange(); }
    catch (e: any) { setErr(e.message); }
  }
  return (
    <Card className="space-y-3">
      <SectionTitle hint={isNovel ? 'Light Novel: dán nội dung text cho mỗi chương.' : 'Manga: dán danh sách URL ảnh trang, mỗi dòng một ảnh.'}>Chương ({chapters.length})</SectionTitle>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
        <input className="input" placeholder="Chương #" value={add.number} onChange={(e) => setAdd({ ...add, number: e.target.value })} />
        <input className="input sm:col-span-2" placeholder="Tiêu đề" value={add.title} onChange={(e) => setAdd({ ...add, title: e.target.value })} />
        <Btn onClick={create} className="sm:col-span-1"><Plus size={15} /> Thêm</Btn>
      </div>
      <textarea className="input min-h-[80px]" placeholder={isNovel ? 'Nội dung chương (text)…' : 'URL ảnh trang, mỗi dòng một ảnh…'}
        value={isNovel ? add.content : add.pages} onChange={(e) => setAdd({ ...add, [isNovel ? 'content' : 'pages']: e.target.value })} />
      <div className="space-y-2">
        {chapters.length === 0 && <Empty icon={<BookOpen size={24} />} title="Chưa có chương nào" />}
        {chapters.map((ch) => <ChapterRow key={ch.id} ch={ch} isNovel={isNovel} onChange={onChange} setErr={setErr} />)}
      </div>
    </Card>
  );
}
function ChapterRow({ ch, isNovel, onChange, setErr }: { ch: Ch; isNovel: boolean; onChange: () => void; setErr: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ number: String(ch.number), title: ch.title || '', pages: (ch.pages || []).join('\n'), content: ch.content || '' });
  return (
    <div className="rounded-lg border border-ink-200/70 p-2 dark:border-ink-700">
      <div className="flex items-center gap-2">
        <input className="input !w-20" value={v.number} onChange={(e) => setV({ ...v, number: e.target.value })} />
        <input className="input flex-1" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Tiêu đề" />
        <Btn size="sm" onClick={() => setOpen((o) => !o)}>{open ? 'Ẩn' : isNovel ? 'Nội dung' : `${ch.pages?.length || 0} trang`}</Btn>
        <Btn size="sm" onClick={async () => { try { await api.patch(`/admin/anime/chapter/${ch.id}`, v); onChange(); } catch (e: any) { setErr(e.message); } }}><Save size={14} /></Btn>
        <Btn size="sm" variant="danger" onClick={async () => { if (confirm('Xoá chương?')) { await api.post(`/admin/anime/chapter/${ch.id}/delete`); onChange(); } }}><Trash2 size={14} /></Btn>
      </div>
      {open && <textarea className="input mt-2 min-h-[120px]" value={isNovel ? v.content : v.pages} onChange={(e) => setV({ ...v, [isNovel ? 'content' : 'pages']: e.target.value })} />}
    </div>
  );
}

export default function AdminAnimeEdit() {
  return <Suspense fallback={<p className="p-10 text-center text-ink-500">Đang tải…</p>}><EditInner /></Suspense>;
}
