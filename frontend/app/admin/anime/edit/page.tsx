'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tv, Save, Plus, Trash2, ArrowLeft, Film, BookOpen, Loader2, Link as LinkIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';


interface Srv { id: string; name: string; videoUrl: string; referer?: string | null; introEnd?: number | null }
interface Ep { id: string; number: number; part: number; kind: string; title?: string | null; videoUrl?: string | null; serverName?: string | null; thumbnail?: string | null; duration?: number | null; referer?: string | null; introEnd?: number | null; showNextAt?: number | null; servers?: Srv[] }
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
  const isStory = w.type === 'MANHUA';

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
          <Field label="Tên gốc"><input className="input" value={w.titleNative || ''} onChange={(e) => set('titleNative', e.target.value)} /></Field>
          <Field label="Loại"><select className="input" value={w.type} onChange={(e) => set('type', e.target.value)}><option value="MANHUA">Manhua (Truyện TQ)</option><option value="DONGHUA">Donghua (Hoạt hình TQ)</option></select></Field>
          <Field label="Trạng thái"><select className="input" value={w.status} onChange={(e) => set('status', e.target.value)}><option value="RELEASING">Đang phát hành</option><option value="FINISHED">Hoàn thành</option><option value="NOT_YET_RELEASED">Sắp ra mắt</option><option value="HIATUS">Tạm ngưng</option><option value="CANCELLED">Đã huỷ</option></select></Field>
          <Field label="Định dạng"><input className="input" value={w.format || ''} onChange={(e) => set('format', e.target.value)} placeholder="TV / MOVIE / ONE_SHOT…" /></Field>
          <Field label="Mùa"><select className="input" value={w.season || ''} onChange={(e) => set('season', e.target.value || null)}><option value="">—</option><option value="WINTER">Đông</option><option value="SPRING">Xuân</option><option value="SUMMER">Hạ</option><option value="FALL">Thu</option></select></Field>
          <Field label="Năm"><input type="number" className="input" value={w.seasonYear || ''} onChange={(e) => set('seasonYear', e.target.value)} /></Field>
          {!isStory && <Field label="Số tập (tổng)"><input type="number" className="input" value={w.episodes ?? ''} onChange={(e) => set('episodes', e.target.value)} /></Field>}
          {!isStory && <Field label="Thời lượng (phút)"><input type="number" className="input" value={w.duration ?? ''} onChange={(e) => set('duration', e.target.value)} /></Field>}
          {isStory && <Field label="Số chương (tổng)"><input type="number" className="input" value={w.chapters ?? ''} onChange={(e) => set('chapters', e.target.value)} /></Field>}
          <Field label="Nguồn"><input className="input" value={w.source || ''} onChange={(e) => set('source', e.target.value)} /></Field>
          <Field label="Trailer URL"><input className="input" value={w.trailerUrl || ''} onChange={(e) => set('trailerUrl', e.target.value)} /></Field>
          <Field label="Ảnh bìa (cover)"><input className="input" value={w.coverUrl || ''} onChange={(e) => set('coverUrl', e.target.value)} /></Field>
          <Field label="Ảnh banner"><input className="input" value={w.bannerUrl || ''} onChange={(e) => set('bannerUrl', e.target.value)} /></Field>
        </div>
        <GenreField w={w} set={set} />
        <Field label="Mô tả"><textarea className="input min-h-[120px]" value={w.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!w.isAdult} onChange={(e) => set('isAdult', e.target.checked)} /> Nội dung 18+</label>
        <Btn onClick={saveInfo}><Save size={15} /> Lưu thông tin</Btn>
      </Card>

      {w.type === 'DONGHUA'
        ? <EpisodeManager mediaId={id} episodes={w.episodeList || []} onChange={load} setErr={setErr} />
        : <ChapterManager mediaId={id} chapters={w.chapterList || []} isNovel={false} onChange={load} setErr={setErr} />}
    </div>
  );
}

function GenreField({ w, set }: { w: any; set: (k: string, v: any) => void }) {
  const [dbGenres, setDbGenres] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    api.get<any[]>(`/anime/genres?type=${w.type}`).then(setDbGenres).catch(() => {});
  }, [w.type]);

  const current: string = w._genres ?? (w.genres || []).map((g: any) => g.name).join(', ');
  const selected = current.split(',').map((x) => x.trim()).filter(Boolean);

  function toggle(name: string) {
    const exists = selected.some((g) => g.toLowerCase() === name.toLowerCase());
    const next = exists
      ? selected.filter((g) => g.toLowerCase() !== name.toLowerCase())
      : [...selected, name];
    set('_genres', next.join(', '));
  }

  return (
    <Field label="Thể loại">
      {dbGenres.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {dbGenres.map((g) => {
            const on = selected.some((s) => s.toLowerCase() === g.name.toLowerCase());
            return (
              <button key={g.id} type="button" onClick={() => toggle(g.name)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  on
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300'
                }`}>
                {g.name}
              </button>
            );
          })}
        </div>
      )}
      {dbGenres.length === 0 && (
        <p className="mb-1 text-xs text-ink-400">Chưa có thể loại. Vào <a href="/admin/genres" className="text-brand-600 hover:underline">Thể loại</a> để tạo trước.</p>
      )}
      <input className="input" value={current} onChange={(e) => set('_genres', e.target.value)} placeholder="Hoặc nhập tay: Action, Fantasy…" />
    </Field>
  );
}

const PAGE_SIZE = 30;

function EpisodeManager({ mediaId, episodes, onChange, setErr }: { mediaId: string; episodes: Ep[]; onChange: () => void; setErr: (s: string) => void }) {
  const [add, setAdd] = useState({ number: '', part: '1', kind: 'episode', title: '', videoUrl: '', thumbnail: '', duration: '', referer: '', introEnd: '', showNextAt: '' });
  const [embedInput, setEmbedInput] = useState('');
  const [embedBusy, setEmbedBusy] = useState(false);
  const [embedCands, setEmbedCands] = useState<{ url: string; referer?: string; status?: number | null }[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  async function create() {
    if (!add.number) { setErr('Nhập số tập'); return; }
    try { await api.post(`/admin/anime/${mediaId}/episode`, add); setAdd({ number: '', part: '1', kind: 'episode', title: '', videoUrl: '', thumbnail: '', duration: '', referer: '', introEnd: '', showNextAt: '' }); onChange(); }
    catch (e: any) { setErr(e.message); }
  }
  async function getEmbed() {
    if (!embedInput.trim()) return;
    setEmbedBusy(true); setErr(''); setEmbedCands([]);
    try {
      const r = await api.post<{ candidates: { url: string; referer?: string; status?: number | null }[] }>('/admin/anime/extract-embed', { input: embedInput });
      setEmbedCands(r.candidates);
      const best = r.candidates.find((c) => c.status && c.status < 400) || r.candidates[0];
      if (best) setAdd((s) => ({ ...s, videoUrl: best.url, referer: best.referer || s.referer }));
    } catch (e: any) { setErr(e.message); } finally { setEmbedBusy(false); }
  }

  const filtered = episodes.filter((ep) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return String(ep.number).includes(q) || (ep.title || '').toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle hint="Mỗi tập có link xem (embed YouTube/iframe/mp4).">Tập phim ({episodes.length})</SectionTitle>
        <Btn size="sm" onClick={() => setShowAddForm((v) => !v)}><Plus size={14} /> {showAddForm ? 'Ẩn form thêm' : 'Thêm tập'}</Btn>
      </div>

      {showAddForm && (
        <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-800 dark:bg-brand-900/20 space-y-3">
          <div className="rounded-lg border border-dashed border-ink-300 p-3 dark:border-ink-600">
            <p className="mb-1.5 text-xs font-medium text-ink-500">Lấy embed tự động — dán link trang tập (vd: vuighe.live/…) hoặc dán nguyên mã &lt;iframe&gt;</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="input flex-1" placeholder="https://vuighe.live/… hoặc <iframe src=…>" value={embedInput} onChange={(e) => setEmbedInput(e.target.value)} />
              <Btn onClick={getEmbed} disabled={embedBusy}>{embedBusy ? <Loader2 size={15} className="animate-spin" /> : <><LinkIcon size={15} /> Lấy embed</>}</Btn>
            </div>
            {embedCands.length > 0 && (
              <div className="mt-2 space-y-1">
                {embedCands.map((c) => {
                  const live = c.status != null ? c.status < 400 : null;
                  return (
                    <button key={c.url} onClick={() => setAdd((s) => ({ ...s, videoUrl: c.url, referer: c.referer || s.referer }))}
                      className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${add.videoUrl === c.url ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'bg-ink-100 dark:bg-ink-800'}`}>
                      {live === true && <span className="mr-1 text-emerald-600">● sống</span>}
                      {live === false && <span className="mr-1 text-red-500">● chết {c.status}</span>}
                      {c.url}{c.referer && <span className="ml-1 text-ink-400">· ref: {c.referer}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-8">
            <input className="input sm:col-span-1" placeholder="Phần #" type="number" min="1" value={add.part} onChange={(e) => setAdd({ ...add, part: e.target.value })} title="Phần (1, 2, 3...)" />
            <select className="input sm:col-span-2" value={add.kind} onChange={(e) => setAdd({ ...add, kind: e.target.value })}>
              <option value="episode">Tập thường</option>
              <option value="movie">Movie</option>
              <option value="ova">OVA</option>
              <option value="special">Special</option>
              <option value="recap">Recap</option>
            </select>
            <input className="input sm:col-span-1" placeholder="Số #" value={add.number} onChange={(e) => setAdd({ ...add, number: e.target.value })} />
            <input className="input sm:col-span-2" placeholder="Tiêu đề" value={add.title} onChange={(e) => setAdd({ ...add, title: e.target.value })} />
            <input className="input sm:col-span-2" placeholder="Link video / embed" value={add.videoUrl} onChange={(e) => setAdd({ ...add, videoUrl: e.target.value })} />
            <input className="input sm:col-span-1" type="number" placeholder="Bỏ intro (s)" title="Bỏ qua đoạn đầu đến giây này (vd 90)" value={add.introEnd} onChange={(e) => setAdd({ ...add, introEnd: e.target.value })} />
            <input className="input sm:col-span-1" type="number" placeholder="Hiện next (s)" title="Giây từ đầu video để hiện nút tập tiếp theo (vd 1300)" value={add.showNextAt} onChange={(e) => setAdd({ ...add, showNextAt: e.target.value })} />
            <input className="input sm:col-span-5" placeholder="Referer (tuỳ chọn — nếu nguồn chặn hotlink, vd https://vuighe.live/)" value={add.referer} onChange={(e) => setAdd({ ...add, referer: e.target.value })} />
            <Btn onClick={create} className="sm:col-span-1"><Plus size={15} /> Thêm</Btn>
          </div>
        </div>
      )}

      {episodes.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input className="input flex-1" placeholder="Tìm tập theo số hoặc tên…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          {search && <span className="text-xs text-ink-500 whitespace-nowrap">{filtered.length} kết quả</span>}
        </div>
      )}

      <div className="space-y-1">
        {episodes.length === 0 && <Empty icon={<Film size={24} />} title="Chưa có tập nào" />}
        {visible.map((ep) => <EpisodeRow key={ep.id} ep={ep} onChange={onChange} setErr={setErr} />)}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Btn size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>‹ Trước</Btn>
          <span className="text-xs text-ink-500">Trang {safePage + 1} / {totalPages}</span>
          <Btn size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>Sau ›</Btn>
        </div>
      )}
    </Card>
  );
}
const KIND_LABELS: Record<string, string> = { episode: 'Tập', movie: 'Movie', ova: 'OVA', special: 'Special', recap: 'Recap' };

function EpisodeRow({ ep, onChange, setErr }: { ep: Ep; onChange: () => void; setErr: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ number: String(ep.number), part: String(ep.part ?? 1), kind: ep.kind || 'episode', title: ep.title || '', videoUrl: ep.videoUrl || '', serverName: ep.serverName || '', referer: ep.referer || '', introEnd: ep.introEnd != null ? String(ep.introEnd) : '', showNextAt: ep.showNextAt != null ? String(ep.showNextAt) : '' });
  useEffect(() => {
    setV({ number: String(ep.number), part: String(ep.part ?? 1), kind: ep.kind || 'episode', title: ep.title || '', videoUrl: ep.videoUrl || '', serverName: ep.serverName || '', referer: ep.referer || '', introEnd: ep.introEnd != null ? String(ep.introEnd) : '', showNextAt: ep.showNextAt != null ? String(ep.showNextAt) : '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ep.id, ep.number, ep.part, ep.kind, ep.title, ep.videoUrl, ep.serverName, ep.referer, ep.introEnd, ep.showNextAt]);
  const [srvOpen, setSrvOpen] = useState(false);
  const [newSrv, setNewSrv] = useState({ name: '', videoUrl: '', referer: '', introEnd: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rowErr, setRowErr] = useState('');
  const extra = ep.servers || [];
  async function save() {
    setSaving(true); setSaved(false); setRowErr(''); setErr('');
    try {
      await api.patch(`/admin/anime/episode/${ep.id}`, v);
      setSaved(true); setTimeout(() => setSaved(false), 2000); onChange();
    } catch (e: any) { setRowErr(e.message || 'Lưu thất bại'); setErr(e.message); }
    finally { setSaving(false); }
  }
  async function addSrv() {
    if (!newSrv.name.trim() || !newSrv.videoUrl.trim()) { setErr('Nhập tên server và link'); return; }
    try { await api.post(`/admin/anime/episode/${ep.id}/server`, newSrv); setNewSrv({ name: '', videoUrl: '', referer: '', introEnd: '' }); onChange(); } catch (e: any) { setErr(e.message); }
  }
  const kindLabel = KIND_LABELS[ep.kind] || ep.kind;
  const partLabel = (ep.part ?? 1) > 1 ? `P${ep.part} ` : '';
  return (
    <div className="rounded-lg border border-ink-200/70 dark:border-ink-700 overflow-hidden">
      {/* Collapsed header — always visible */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left min-w-0">
          <span className="shrink-0 rounded bg-ink-100 px-2 py-0.5 text-xs font-bold tabular-nums dark:bg-ink-800">
            {partLabel}{kindLabel} {ep.number}
          </span>
          <span className="truncate text-sm text-ink-700 dark:text-ink-300">{ep.title || <span className="text-ink-400 italic">Chưa có tiêu đề</span>}</span>
          {ep.kind !== 'episode' && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{kindLabel}</span>}
          {extra.length > 0 && <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">+{extra.length} server</span>}
          {ep.videoUrl && <span className="shrink-0 text-[10px] text-emerald-600">● Link</span>}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {saved && <span className="text-xs font-medium text-emerald-600">✓</span>}
          <Btn size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} title={open ? 'Thu gọn' : 'Mở rộng'}>
            <span className="text-xs">{open ? '▲' : '▼'}</span>
          </Btn>
          <Btn size="sm" variant="danger" onClick={async () => { if (confirm('Xoá tập?')) { await api.post(`/admin/anime/episode/${ep.id}/delete`); onChange(); } }}><Trash2 size={13} /></Btn>
        </div>
      </div>

      {/* Expanded edit fields */}
      {open && (
        <div className="border-t border-ink-100 px-2 pb-2 pt-2 dark:border-ink-800 space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-9">
            <input className="input sm:col-span-1" type="number" min="1" value={v.part} onChange={(e) => setV({ ...v, part: e.target.value })} placeholder="Phần #" title="Phần (1, 2, 3...)" />
            <select className="input sm:col-span-2" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
              <option value="episode">Tập thường</option>
              <option value="movie">Movie</option>
              <option value="ova">OVA</option>
              <option value="special">Special</option>
              <option value="recap">Recap</option>
            </select>
            <input className="input sm:col-span-1" value={v.number} onChange={(e) => setV({ ...v, number: e.target.value })} placeholder="Số #" />
            <input className="input sm:col-span-2" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Tiêu đề" />
            <input className="input sm:col-span-1" value={v.serverName} onChange={(e) => setV({ ...v, serverName: e.target.value })} placeholder="Tên server (VIP)" title="Tên hiển thị server chính, mặc định VIP" />
            <input className="input sm:col-span-1" value={v.videoUrl} onChange={(e) => setV({ ...v, videoUrl: e.target.value })} placeholder="Link video" />
            <input className="input sm:col-span-1" type="number" value={v.introEnd} onChange={(e) => setV({ ...v, introEnd: e.target.value })} placeholder="Bỏ intro (s)" title="Bỏ qua đoạn đầu đến giây này cho Server 1 (vd 90)." />
          </div>
          <div className="flex gap-2">
            <input className="input w-40 shrink-0" type="number" value={v.showNextAt} onChange={(e) => setV({ ...v, showNextAt: e.target.value })} placeholder="Hiện next (s)" title="Giây từ đầu video để hiện nút tập tiếp theo (vd 1300). Để trống = tự tính theo thời lượng." />
            <input className="input flex-1" value={v.referer} onChange={(e) => setV({ ...v, referer: e.target.value })} placeholder="Referer Server 1 (tuỳ chọn)" />
            <Btn size="sm" onClick={save} disabled={saving} title="Lưu tập">{saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Lưu</>}</Btn>
          </div>
          {rowErr && <p className="text-xs text-rose-600">⚠ {rowErr}</p>}

          <button onClick={() => setSrvOpen((o) => !o)} className="text-xs font-medium text-brand-600 hover:underline">{srvOpen ? 'Ẩn server phụ' : `Server phụ (${extra.length})`}</button>
          {srvOpen && (
            <div className="space-y-2 border-t border-ink-100 pt-2 dark:border-ink-800">
              {extra.map((s) => <ServerRow key={s.id} s={s} onChange={onChange} setErr={setErr} />)}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-8">
                <input className="input sm:col-span-2" placeholder="Tên (VIP 2…)" value={newSrv.name} onChange={(e) => setNewSrv({ ...newSrv, name: e.target.value })} />
                <input className="input sm:col-span-3" placeholder="Link video" value={newSrv.videoUrl} onChange={(e) => setNewSrv({ ...newSrv, videoUrl: e.target.value })} />
                <input className="input sm:col-span-1" type="number" placeholder="Bỏ intro (s)" value={newSrv.introEnd} onChange={(e) => setNewSrv({ ...newSrv, introEnd: e.target.value })} />
                <input className="input sm:col-span-1" placeholder="Referer" value={newSrv.referer} onChange={(e) => setNewSrv({ ...newSrv, referer: e.target.value })} />
                <Btn size="sm" onClick={addSrv}><Plus size={14} /></Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function ServerRow({ s, onChange, setErr }: { s: Srv; onChange: () => void; setErr: (m: string) => void }) {
  const [v, setV] = useState({ name: s.name, videoUrl: s.videoUrl, referer: s.referer || '', introEnd: s.introEnd != null ? String(s.introEnd) : '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save() {
    setSaving(true); setSaved(false); setErr('');
    try { await api.patch(`/admin/anime/server/${s.id}`, v); setSaved(true); setTimeout(() => setSaved(false), 2000); onChange(); }
    catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-8">
      <input className="input sm:col-span-2" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      <input className="input sm:col-span-3" value={v.videoUrl} onChange={(e) => setV({ ...v, videoUrl: e.target.value })} />
      <input className="input sm:col-span-1" type="number" value={v.introEnd} onChange={(e) => setV({ ...v, introEnd: e.target.value })} placeholder="Bỏ intro (s)" title="Bỏ qua đoạn đầu đến giây này (chỉ áp cho link m3u8/mp4)" />
      <input className="input sm:col-span-1" value={v.referer} onChange={(e) => setV({ ...v, referer: e.target.value })} placeholder="Referer" />
      <div className="flex items-center gap-1">
        <Btn size="sm" onClick={save} disabled={saving} title="Lưu server">{saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}</Btn>
        <Btn size="sm" variant="danger" onClick={async () => { if (confirm('Xoá server?')) { await api.post(`/admin/anime/server/${s.id}/delete`); onChange(); } }}><Trash2 size={13} /></Btn>
        {saved && <span className="text-xs font-medium text-emerald-600">✓</span>}
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
