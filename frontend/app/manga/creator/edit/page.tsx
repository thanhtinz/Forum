'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, ChevronLeft, Upload, Plus, Trash2, CheckCircle,
  Send, Eye, EyeOff, BarChart2, Info, Tag, Settings,
  ExternalLink, Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Card, SectionTitle, Btn, Field, Notice } from '@/components/admin/ui';

interface Chapter {
  id: string; number: number; title?: string | null; volume?: number | null;
  chapterStatus: string; scheduledAt?: string | null; viewCount: number; createdAt: string;
}

interface Series {
  id: string; slug: string; title: string;
  titleEnglish?: string | null; titleNative?: string | null;
  synonyms?: string[]; description?: string | null;
  coverUrl?: string | null; bannerUrl?: string | null;
  publishStatus?: string | null; language?: string | null;
  ageRating: number; status: string;
  seasonYear?: number | null; publisher?: string | null;
  author?: string | null; artist?: string | null;
  tags?: string[];
  countryOfOrigin?: string | null; type?: string | null;
  format?: string | null;
  genres?: { name: string; slug: string }[];
  chapterList: Chapter[];
  allowComments?: boolean; allowRating?: boolean; allowFollow?: boolean;
  seoTitle?: string | null; seoDescription?: string | null; seoKeywords?: string[];
}

interface Stats {
  totalViews: number; chapterCount: number; publishedChapters: number;
  favoriteCount: number; ratingCount: number; avgScore: number;
}

const PUBLISH_LABELS: Record<string, string> = {
  DRAFT: 'Nháp / Ẩn', PENDING: 'Đang chờ duyệt',
  PUBLISHED: 'Đã xuất bản', REJECTED: 'Bị từ chối',
};
const CHAPTER_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' },
  PENDING_REVIEW: { label: 'Đang duyệt', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  PUBLISHED: { label: 'Đã xuất bản', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  SCHEDULED: { label: 'Lên lịch', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' },
};
const STATUS_OPTIONS = [
  { v: 'RELEASING', l: 'Đang tiến hành' }, { v: 'FINISHED', l: 'Hoàn thành' },
  { v: 'NOT_YET_RELEASED', l: 'Sắp ra mắt' }, { v: 'HIATUS', l: 'Tạm ngưng' },
  { v: 'CANCELLED', l: 'Đã hủy' },
];
const COUNTRY_OPTIONS = [
  { v: '', l: '— Chọn quốc gia —' }, { v: 'CN', l: 'Trung Quốc' },
  { v: 'JP', l: 'Nhật Bản' }, { v: 'KR', l: 'Hàn Quốc' },
  { v: 'VN', l: 'Việt Nam' }, { v: 'US', l: 'Mỹ' }, { v: 'OTHER', l: 'Khác' },
];

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2.5 dark:border-ink-800">
      <span>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
      </span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-ink-200 dark:bg-ink-700'}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

type Tab = 'info' | 'classify' | 'settings' | 'chapters';
const TABS: { id: Tab; label: string }[] = [
  { id: 'info', label: 'Thông tin' },
  { id: 'classify', label: 'Phân loại' },
  { id: 'settings', label: 'Cài đặt' },
  { id: 'chapters', label: 'Chương' },
];

function EditSeriesInner() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { user, loading: authLoading } = useAuth();

  const [series, setSeries] = useState<Series | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [form, setForm] = useState({
    title: '', titleEnglish: '', titleNative: '',
    synonymsRaw: '', description: '',
    author: '', artist: '', publisher: '',
    language: 'vi', ageRating: '0',
    status: 'RELEASING', seasonYear: '',
    countryOfOrigin: '',
    tagsRaw: '',
    seoTitle: '', seoDescription: '', seoKeywordsRaw: '',
  });
  const [allowComments, setAllowComments] = useState(true);
  const [allowRating, setAllowRating] = useState(true);
  const [allowFollow, setAllowFollow] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [dbGenres, setDbGenres] = useState<{ id: string; name: string }[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const coverRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const s = await api.get<Series>(`/creator/manga/${id}`);
      setSeries(s);
      setForm({
        title: s.title,
        titleEnglish: s.titleEnglish ?? '',
        titleNative: s.titleNative ?? '',
        synonymsRaw: (s.synonyms ?? []).join(', '),
        description: s.description ?? '',
        author: s.author ?? '',
        artist: s.artist ?? '',
        publisher: s.publisher ?? '',
        language: s.language ?? 'vi',
        ageRating: String(s.ageRating),
        status: s.status ?? 'RELEASING',
        seasonYear: s.seasonYear ? String(s.seasonYear) : '',
        countryOfOrigin: s.countryOfOrigin ?? '',
        tagsRaw: (s.tags ?? []).join(', '),
        seoTitle: s.seoTitle ?? '',
        seoDescription: s.seoDescription ?? '',
        seoKeywordsRaw: (s.seoKeywords ?? []).join(', '),
      });
      setAllowComments(s.allowComments ?? true);
      setAllowRating(s.allowRating ?? true);
      setAllowFollow(s.allowFollow ?? true);
      setSelectedGenres((s.genres ?? []).map((g) => g.name));
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function loadStats() {
    api.get<Stats>(`/creator/manga/${id}/stats`).then(setStats).catch(() => {});
  }

  useEffect(() => { if (id) { load(); loadStats(); } }, [id]);

  useEffect(() => {
    if (!series?.type) return;
    api.get<any[]>(`/anime/genres?type=${series.type}`).then(setDbGenres).catch(() => {});
  }, [series?.type]);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Nhập tên truyện'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.patch(`/creator/manga/${id}`, {
        title: form.title,
        titleEnglish: form.titleEnglish || undefined,
        titleNative: form.titleNative || undefined,
        synonyms: form.synonymsRaw.split(',').map((x) => x.trim()).filter(Boolean),
        description: form.description || undefined,
        author: form.author || undefined,
        artist: form.artist || undefined,
        publisher: form.publisher || undefined,
        language: form.language,
        ageRating: Number(form.ageRating),
        status: form.status,
        seasonYear: form.seasonYear ? Number(form.seasonYear) : undefined,
        countryOfOrigin: form.countryOfOrigin || undefined,
        genreNames: selectedGenres,
        tags: form.tagsRaw.split(',').map((x) => x.trim()).filter(Boolean),
        allowComments,
        allowRating,
        allowFollow,
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        seoKeywords: form.seoKeywordsRaw.split(',').map((x) => x.trim()).filter(Boolean),
      });
      setMsg('Đã lưu ✓');
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function uploadImage(endpoint: string, file: File, onDone: () => void) {
    setBusy(true); setErr(''); setMsg('');
    const fd = new FormData(); fd.append('file', file);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('forum_token') : null;
      const res = await fetch(`${base}/api/creator/manga/${id}/${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) { const b = await res.json(); throw new Error(b?.message ?? res.statusText); }
      onDone();
      setMsg(`Đã cập nhật ảnh ✓`);
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function submitReview() {
    if (!confirm('Gửi series này để kiểm duyệt?')) return;
    setBusy(true); setErr(''); setMsg('');
    try { await api.post(`/creator/manga/${id}/submit`); setMsg('Đã gửi yêu cầu kiểm duyệt ✓'); await load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function toggleVisibility() {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await api.post<{ hidden: boolean }>(`/creator/manga/${id}/visibility`);
      setMsg(r.hidden ? 'Đã ẩn series ✓' : 'Đã hiện series ✓');
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function delChapter(ch: Chapter) {
    if (!confirm(`Xoá chương ${ch.number}?`)) return;
    setErr('');
    try { await api.del(`/creator/chapter/${ch.id}`); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  async function publishChapter(ch: Chapter) {
    setErr(''); setMsg('');
    try { await api.post(`/creator/chapter/${ch.id}/publish`); setMsg(`Đã gửi chương ${ch.number} ✓`); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  if (authLoading || loading) return <div className="p-10 text-center text-ink-400">{err || 'Đang tải...'}</div>;
  if (!user) return <div className="p-10 text-center">Đăng nhập để tiếp tục.</div>;
  if (!series) return <div className="p-10 text-center text-rose-500">{err || 'Không tìm thấy series.'}</div>;

  const ps = series.publishStatus ?? 'DRAFT';
  const isHidden = ps === 'DRAFT';

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/manga/creator" className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300">
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">{series.title}</h1>
          <p className="text-xs text-ink-500">Trạng thái: <span className="font-medium text-ink-700 dark:text-ink-300">{PUBLISH_LABELS[ps] ?? ps}</span></p>
        </div>
        <a href={`/anime/detail?slug=${series.slug}`} target="_blank"
          className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
          <ExternalLink size={12} /> Xem trang
        </a>
      </div>

      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            { label: 'Lượt xem', value: stats.totalViews.toLocaleString() },
            { label: 'Chương', value: `${stats.publishedChapters}/${stats.chapterCount}` },
            { label: 'Theo dõi', value: stats.favoriteCount.toLocaleString() },
            { label: 'Đánh giá', value: stats.ratingCount.toLocaleString() },
            { label: 'Điểm TB', value: stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—' },
          ].map((s) => (
            <div key={s.label} className="card p-3 text-center">
              <p className="text-lg font-bold text-brand-600">{s.value}</p>
              <p className="text-[11px] text-ink-500">{s.label}</p>
            </div>
          ))}
          <div className="card flex items-center justify-center p-3">
            <button onClick={loadStats} className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-brand-600">
              <BarChart2 size={12} /> Làm mới
            </button>
          </div>
        </div>
      )}

      {/* Cover + Banner + Publish */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Images */}
        <Card className="space-y-3">
          <SectionTitle>Hình ảnh</SectionTitle>

          {/* Banner */}
          <div>
            <p className="mb-1 text-[11px] font-medium text-ink-500">Banner (16:5)</p>
            <div className="relative h-16 w-full overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
              {(bannerPreview ?? series.bannerUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerPreview ?? series.bannerUrl!} alt="" className="h-full w-full object-cover" />
              )}
              <button type="button" onClick={() => bannerRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                <Upload size={16} className="text-white" />
              </button>
            </div>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); }} />
            {bannerFile && <Btn size="sm" className="mt-1 w-full" onClick={() => uploadImage('banner', bannerFile, () => { setBannerFile(null); setBannerPreview(null); })} disabled={busy}>Lưu banner</Btn>}
          </div>

          {/* Cover */}
          <div className="flex items-start gap-3">
            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
              {(coverPreview ?? series.coverUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview ?? series.coverUrl!} alt="" className="h-full w-full object-cover" />
              )}
              <button type="button" onClick={() => coverRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                <Upload size={14} className="text-white" />
              </button>
            </div>
            <div className="flex-1 space-y-1.5 pt-1">
              <p className="text-xs text-ink-500">Ảnh bìa (3:4, max 5MB)</p>
              <Btn size="sm" variant="outline" onClick={() => coverRef.current?.click()}><Upload size={12} /> Chọn ảnh</Btn>
              {coverFile && <Btn size="sm" onClick={() => uploadImage('cover', coverFile, () => { setCoverFile(null); setCoverPreview(null); })} disabled={busy}>Lưu ảnh bìa</Btn>}
            </div>
          </div>
          <input ref={coverRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }} />
        </Card>

        {/* Publish */}
        <Card className="flex flex-col gap-3">
          <SectionTitle>Xuất bản & Hiển thị</SectionTitle>
          <p className="text-sm text-ink-500">Trạng thái: <span className="font-semibold text-ink-700 dark:text-ink-200">{PUBLISH_LABELS[ps] ?? ps}</span></p>
          <div className="flex flex-wrap gap-2">
            {(ps === 'DRAFT' || ps === 'REJECTED') && (
              <Btn onClick={submitReview} disabled={busy}><Send size={14} /> Gửi kiểm duyệt</Btn>
            )}
            {ps === 'PENDING' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">Đang chờ admin xét duyệt...</p>
            )}
            {ps === 'PUBLISHED' && (
              <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle size={14} /> Đã xuất bản</span>
            )}
            {ps === 'REJECTED' && (
              <p className="text-xs text-rose-500">Bị từ chối. Chỉnh sửa và gửi lại.</p>
            )}
          </div>
          {ps === 'PUBLISHED' && (
            <Btn size="sm" variant="outline" onClick={toggleVisibility} disabled={busy}>
              {isHidden ? <><Eye size={13} /> Hiện truyện</> : <><EyeOff size={13} /> Ẩn truyện</>}
            </Btn>
          )}
          <div className="mt-auto rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-400 dark:bg-ink-800">
            Slug: <span className="font-mono">{series.slug}</span>
          </div>
        </Card>
      </div>

      {/* Tab navigation */}
      <div className="flex overflow-x-auto rounded-xl border border-ink-200 bg-white p-1 dark:border-ink-700 dark:bg-ink-900">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${activeTab === t.id ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="space-y-4">

        {/* Tab: Thông tin */}
        {activeTab === 'info' && (
          <Card className="space-y-4">
            <SectionTitle><Info size={14} className="inline mr-1" />Thông tin cơ bản</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tên truyện *">
                <input value={form.title} onChange={(e) => set('title', e.target.value)} required className="input w-full" />
              </Field>
              <Field label="Tên tiếng Anh">
                <input value={form.titleEnglish} onChange={(e) => set('titleEnglish', e.target.value)} className="input w-full" placeholder="English title" />
              </Field>
              <Field label="Tên gốc">
                <input value={form.titleNative} onChange={(e) => set('titleNative', e.target.value)} className="input w-full" placeholder="原作タイトル / 原名" />
              </Field>
              <Field label="Tên khác (Alternative Names)" hint="Phân cách bằng dấu phẩy">
                <input value={form.synonymsRaw} onChange={(e) => set('synonymsRaw', e.target.value)} className="input w-full" placeholder="Tên 1, Tên 2…" />
              </Field>
              <Field label="Tác giả (Author)">
                <input value={form.author} onChange={(e) => set('author', e.target.value)} className="input w-full" placeholder="Tên tác giả" />
              </Field>
              {series.format !== 'NOVEL' && (
                <Field label="Họa sĩ (Artist)">
                  <input value={form.artist} onChange={(e) => set('artist', e.target.value)} className="input w-full" placeholder="Tên họa sĩ" />
                </Field>
              )}
              <Field label="Nhóm dịch / NXB">
                <input value={form.publisher} onChange={(e) => set('publisher', e.target.value)} className="input w-full" placeholder="Nhóm scan / NXB…" />
              </Field>
              <Field label="Năm phát hành">
                <input type="number" value={form.seasonYear} onChange={(e) => set('seasonYear', e.target.value)} className="input w-full" placeholder="2024" min="1900" max="2099" />
              </Field>
            </div>
            <Field label="Mô tả / Tóm tắt">
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className="input w-full" />
            </Field>
          </Card>
        )}

        {/* Tab: Phân loại */}
        {activeTab === 'classify' && (
          <Card className="space-y-4">
            <SectionTitle><Tag size={14} className="inline mr-1" />Phân loại</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Quốc gia">
                <select value={form.countryOfOrigin} onChange={(e) => set('countryOfOrigin', e.target.value)} className="input w-full">
                  {COUNTRY_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Tình trạng">
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input w-full">
                  {STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Ngôn ngữ">
                <select value={form.language} onChange={(e) => set('language', e.target.value)} className="input w-full">
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </Field>
              <Field label="Giới hạn độ tuổi">
                <select value={form.ageRating} onChange={(e) => set('ageRating', e.target.value)} className="input w-full">
                  <option value="0">Mọi lứa tuổi</option>
                  <option value="13">13+</option>
                  <option value="16">16+</option>
                  <option value="18">18+ (người lớn)</option>
                </select>
              </Field>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">Thể loại</p>
              {dbGenres.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {dbGenres.map((g) => {
                    const on = selectedGenres.includes(g.name);
                    return (
                      <button key={g.id} type="button"
                        onClick={() => setSelectedGenres((p) => on ? p.filter((x) => x !== g.name) : [...p, g.name])}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${on ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300'}`}>
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedGenres.length > 0 && <p className="text-[11px] text-ink-400">Đã chọn: {selectedGenres.join(', ')}</p>}
            </div>

            <Field label="Tags" hint="Từ khoá phân cách bằng dấu phẩy (vd: harem, tu tiên, hệ thống)">
              <input value={form.tagsRaw} onChange={(e) => set('tagsRaw', e.target.value)} className="input w-full" placeholder="Tag 1, Tag 2, Tag 3..." />
            </Field>
          </Card>
        )}

        {/* Tab: Cài đặt */}
        {activeTab === 'settings' && (
          <Card className="space-y-3">
            <SectionTitle><Settings size={14} className="inline mr-1" />Cài đặt truyện</SectionTitle>
            <Toggle label="Cho phép bình luận" hint="Người đọc có thể bình luận trên các chương" checked={allowComments} onChange={setAllowComments} />
            <Toggle label="Cho phép đánh giá" hint="Người đọc có thể cho điểm truyện" checked={allowRating} onChange={setAllowRating} />
            <Toggle label="Cho phép theo dõi" hint="Người đọc có thể thêm vào danh sách theo dõi" checked={allowFollow} onChange={setAllowFollow} />
            {Number(form.ageRating) >= 18 && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                <Info size={13} /> Truyện 18+ đã được đánh dấu. Chỉ hiển thị với người dùng đủ tuổi.
              </div>
            )}
          </Card>
        )}

        {/* Save button for all tabs except chapters */}
        {activeTab !== 'chapters' && (
          <div className="flex justify-end border-t border-ink-100 pt-2 dark:border-ink-800">
            <Btn type="submit" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</Btn>
          </div>
        )}
      </form>

      {/* Tab: Chương */}
      {activeTab === 'chapters' && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Danh sách chương ({series.chapterList.length})</SectionTitle>
            <Link href={`/manga/creator/chapter/new?mediaId=${id}`}>
              <Btn size="sm"><Plus size={12} /> Thêm chương</Btn>
            </Link>
          </div>

          {series.chapterList.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">Chưa có chương nào. Thêm chương đầu tiên!</p>
          ) : (
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {series.chapterList.map((ch) => {
                const cs = CHAPTER_LABELS[ch.chapterStatus] ?? CHAPTER_LABELS.DRAFT;
                return (
                  <div key={ch.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-[3.5rem] text-sm font-semibold">Tập {ch.number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-600">{ch.title ?? ''}</p>
                      {ch.scheduledAt && (
                        <p className="flex items-center gap-0.5 text-[10px] text-sky-500">
                          <Calendar size={9} /> {new Date(ch.scheduledAt).toLocaleDateString('vi')}
                        </p>
                      )}
                    </div>
                    {ch.viewCount > 0 && <span className="text-xs text-ink-400">{ch.viewCount} lượt</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cs.cls}`}>{cs.label}</span>
                    <Link href={`/manga/creator/chapter/new?chapterId=${ch.id}&mediaId=${id}`}>
                      <Btn size="sm" variant="outline" title="Quản lý trang"><Eye size={12} /></Btn>
                    </Link>
                    {ch.chapterStatus === 'DRAFT' && (
                      <Btn size="sm" variant="outline" title="Xuất bản chương" onClick={() => publishChapter(ch)}>
                        <CheckCircle size={12} />
                      </Btn>
                    )}
                    <Btn size="sm" variant="danger" title="Xoá chương" onClick={() => delChapter(ch)}>
                      <Trash2 size={12} />
                    </Btn>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function EditSeriesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-400">Đang tải...</div>}>
      <EditSeriesInner />
    </Suspense>
  );
}
