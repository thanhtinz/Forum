'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronLeft, Upload, Plus, Trash2, CheckCircle, Send, Eye, EyeOff, BarChart2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { PageHeader, Card, SectionTitle, Btn, Field, Notice } from '@/components/admin/ui';

interface Chapter {
  id: string;
  number: number;
  title?: string | null;
  volume?: number | null;
  chapterStatus: string;
  viewCount: number;
  createdAt: string;
}

interface Series {
  id: string;
  slug: string;
  title: string;
  titleEnglish?: string | null;
  titleNative?: string | null;
  synonyms?: string[];
  description?: string | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  publishStatus?: string | null;
  language?: string | null;
  ageRating: number;
  status: string;
  seasonYear?: number | null;
  publisher?: string | null;
  countryOfOrigin?: string | null;
  type?: string | null;
  genres?: { name: string; slug: string }[];
  chapterList: Chapter[];
}

interface Stats {
  totalViews: number;
  chapterCount: number;
  publishedChapters: number;
  favoriteCount: number;
  ratingCount: number;
  avgScore: number;
}

const PUBLISH_LABELS: Record<string, string> = {
  DRAFT: 'Nháp / Ẩn',
  PENDING: 'Đang chờ duyệt',
  PUBLISHED: 'Đã xuất bản',
  REJECTED: 'Bị từ chối',
};

const CHAPTER_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' },
  PENDING_REVIEW: { label: 'Đang duyệt', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  PUBLISHED: { label: 'Đã xuất bản', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  SCHEDULED: { label: 'Lên lịch', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' },
};

const STATUS_OPTIONS = [
  { v: 'RELEASING', l: 'Đang tiến hành' },
  { v: 'FINISHED',  l: 'Hoàn thành' },
  { v: 'HIATUS',    l: 'Tạm ngưng' },
  { v: 'CANCELLED', l: 'Drop' },
];

const COUNTRY_OPTIONS = [
  { v: '', l: '— Chọn quốc gia —' },
  { v: 'CN', l: 'Trung Quốc' },
  { v: 'JP', l: 'Nhật Bản' },
  { v: 'KR', l: 'Hàn Quốc' },
  { v: 'VN', l: 'Việt Nam' },
  { v: 'US', l: 'Mỹ' },
  { v: 'OTHER', l: 'Khác' },
];

function EditSeriesInner() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { user, loading: authLoading } = useAuth();

  const [series, setSeries] = useState<Series | null>(null);
  const [form, setForm] = useState({
    title: '', titleEnglish: '', titleNative: '',
    synonymsRaw: '', // comma-separated alias
    description: '', language: 'vi', ageRating: '0',
    status: 'RELEASING', seasonYear: '', publisher: '', countryOfOrigin: '',
  });
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [dbGenres, setDbGenres] = useState<{ id: string; name: string }[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

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
        language: s.language ?? 'vi',
        ageRating: String(s.ageRating),
        status: s.status ?? 'RELEASING',
        seasonYear: s.seasonYear ? String(s.seasonYear) : '',
        publisher: s.publisher ?? '',
        countryOfOrigin: s.countryOfOrigin ?? '',
      });
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
        language: form.language,
        ageRating: Number(form.ageRating),
        status: form.status,
        seasonYear: form.seasonYear ? Number(form.seasonYear) : undefined,
        publisher: form.publisher || undefined,
        countryOfOrigin: form.countryOfOrigin || undefined,
        genreNames: selectedGenres,
      });
      setMsg('Đã lưu ✓');
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function doUploadCover() {
    if (!coverFile) return;
    setBusy(true); setErr(''); setMsg('');
    const fd = new FormData();
    fd.append('file', coverFile);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('forum_token') : null;
      const res = await fetch(`${base}/api/creator/manga/${id}/cover`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) { const b = await res.json(); throw new Error(b?.message ?? res.statusText); }
      setMsg('Đã cập nhật ảnh bìa ✓');
      setCoverFile(null); setCoverPreview(null);
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function submitReview() {
    if (!confirm('Gửi series này để kiểm duyệt?')) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.post(`/creator/manga/${id}/submit`);
      setMsg('Đã gửi yêu cầu kiểm duyệt ✓');
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
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
    try {
      await api.post(`/creator/chapter/${ch.id}/publish`);
      setMsg(`Đã gửi chương ${ch.number} ✓`);
      await load();
    } catch (e: any) { setErr(e.message); }
  }

  if (authLoading || loading) return <div className="p-10 text-center text-ink-400">{err || 'Đang tải...'}</div>;
  if (!user) return <div className="p-10 text-center">Đăng nhập để tiếp tục.</div>;
  if (!series) return <div className="p-10 text-center text-rose-500">{err || 'Không tìm thấy series.'}</div>;

  const ps = series.publishStatus ?? 'DRAFT';
  const isHidden = ps === 'DRAFT';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Link href="/manga/creator" className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300">
          <ChevronLeft size={20} />
        </Link>
        <PageHeader icon={<BookOpen size={20} />} title={series.title} desc={`Trạng thái: ${PUBLISH_LABELS[ps] ?? ps}`} />
      </div>

      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: 'Lượt xem', value: stats.totalViews.toLocaleString() },
            { label: 'Chương', value: `${stats.publishedChapters}/${stats.chapterCount}` },
            { label: 'Yêu thích', value: stats.favoriteCount.toLocaleString() },
            { label: 'Đánh giá', value: stats.ratingCount.toLocaleString() },
            { label: 'Điểm TB', value: stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—' },
          ].map((s) => (
            <div key={s.label} className="card p-3 text-center">
              <p className="text-lg font-bold text-brand-600">{s.value}</p>
              <p className="text-[11px] text-ink-500">{s.label}</p>
            </div>
          ))}
          <div className="card flex items-center justify-center p-3">
            <button onClick={loadStats} className="text-[11px] text-ink-400 hover:text-brand-600 flex items-center gap-1"><BarChart2 size={12} /> Làm mới</button>
          </div>
        </div>
      )}

      {/* Cover + publish status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <SectionTitle>Ảnh bìa</SectionTitle>
          <div className="flex gap-4">
            {(coverPreview ?? series.coverUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview ?? series.coverUrl!} alt="" className="h-36 w-24 rounded object-cover shadow" />
            ) : (
              <div className="grid h-36 w-24 place-items-center rounded bg-ink-100 text-ink-300 dark:bg-ink-800">
                <BookOpen size={28} />
              </div>
            )}
            <div className="flex flex-col justify-center gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800">
                  <Upload size={12} /> Chọn ảnh
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }} />
              </label>
              {coverFile && <Btn size="sm" onClick={doUploadCover} disabled={busy}>Lưu ảnh bìa</Btn>}
            </div>
          </div>
        </Card>

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
              <div className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle size={14} /> Đã xuất bản</div>
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
        </Card>
      </div>

      {/* Edit form */}
      <Card>
        <SectionTitle>Thông tin series</SectionTitle>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên truyện *">
              <input value={form.title} onChange={(e) => set('title', e.target.value)} required className="input w-full" />
            </Field>
            <Field label="Tên tiếng Anh">
              <input value={form.titleEnglish} onChange={(e) => set('titleEnglish', e.target.value)} className="input w-full" placeholder="English title" />
            </Field>
            <Field label="Tên gốc">
              <input value={form.titleNative} onChange={(e) => set('titleNative', e.target.value)} className="input w-full" placeholder="原作タイトル" />
            </Field>
            <Field label="Tên khác / Alias" hint="Phân cách bằng dấu phẩy">
              <input value={form.synonymsRaw} onChange={(e) => set('synonymsRaw', e.target.value)} className="input w-full" placeholder="Tên 1, Tên 2…" />
            </Field>
            <Field label="Tình trạng">
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input w-full">
                {STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </Field>
            <Field label="Năm phát hành">
              <input type="number" value={form.seasonYear} onChange={(e) => set('seasonYear', e.target.value)} className="input w-full" placeholder="2024" min="1900" max="2099" />
            </Field>
            <Field label="Nhà xuất bản / Nhóm dịch">
              <input value={form.publisher} onChange={(e) => set('publisher', e.target.value)} className="input w-full" placeholder="NXB / Nhóm scan…" />
            </Field>
            <Field label="Quốc gia">
              <select value={form.countryOfOrigin} onChange={(e) => set('countryOfOrigin', e.target.value)} className="input w-full">
                {COUNTRY_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </Field>
            <Field label="Ngôn ngữ">
              <select value={form.language} onChange={(e) => set('language', e.target.value)} className="input w-full">
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
              </select>
            </Field>
            <Field label="Giới hạn độ tuổi">
              <select value={form.ageRating} onChange={(e) => set('ageRating', e.target.value)} className="input w-full">
                <option value="0">Mọi lứa tuổi</option>
                <option value="13">13+</option>
                <option value="16">16+</option>
                <option value="18">18+</option>
              </select>
            </Field>
          </div>

          <Field label="Mô tả">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className="input w-full" />
          </Field>

          {/* Thể loại */}
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
            {selectedGenres.length > 0 && (
              <p className="text-[11px] text-ink-400">Đã chọn: {selectedGenres.join(', ')}</p>
            )}
          </div>

          <div className="flex justify-end border-t border-ink-100 pt-3 dark:border-ink-800">
            <Btn type="submit" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</Btn>
          </div>
        </form>
      </Card>

      {/* Chapters */}
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
                  <span className="flex-1 truncate text-sm text-ink-500">{ch.title ?? ''}</span>
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
