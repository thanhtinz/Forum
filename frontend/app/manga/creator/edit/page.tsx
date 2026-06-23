'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronLeft, Upload, Plus, Trash2, CheckCircle, Send, Eye } from 'lucide-react';
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
  description?: string | null;
  coverUrl?: string | null;
  publishStatus?: string | null;
  language?: string | null;
  ageRating: number;
  status: string;
  chapterList: Chapter[];
}

const PUBLISH_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
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

function EditSeriesInner() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { user, loading: authLoading } = useAuth();

  const [series, setSeries] = useState<Series | null>(null);
  const [form, setForm] = useState({ title: '', titleEnglish: '', titleNative: '', description: '', language: 'vi', ageRating: '0' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
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
        description: s.description ?? '',
        language: s.language ?? 'vi',
        ageRating: String(s.ageRating),
      });
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { if (id) load(); }, [id]);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Nhập tên truyện'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.patch(`/creator/manga/${id}`, {
        ...form,
        ageRating: Number(form.ageRating),
        titleEnglish: form.titleEnglish || undefined,
        titleNative: form.titleNative || undefined,
        description: form.description || undefined,
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Link href="/manga/creator" className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300">
          <ChevronLeft size={20} />
        </Link>
        <PageHeader
          icon={<BookOpen size={20} />}
          title={series.title}
          desc={`Trạng thái: ${PUBLISH_LABELS[ps] ?? ps}`}
        />
      </div>

      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      {/* Cover + publish status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <SectionTitle>Ảnh bìa</SectionTitle>
          <div className="flex gap-4">
            {(coverPreview ?? series.coverUrl) ? (
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
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setCoverFile(f);
                    setCoverPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
              {coverFile && (
                <Btn size="sm" onClick={doUploadCover} disabled={busy}>
                  Lưu ảnh bìa
                </Btn>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col">
          <SectionTitle>Xuất bản</SectionTitle>
          <p className="mb-3 text-sm text-ink-500">
            Trạng thái:{' '}
            <span className="font-semibold text-ink-700 dark:text-ink-200">{PUBLISH_LABELS[ps] ?? ps}</span>
          </p>
          {(ps === 'DRAFT' || ps === 'REJECTED') && (
            <Btn onClick={submitReview} disabled={busy}>
              <Send size={14} /> Gửi kiểm duyệt
            </Btn>
          )}
          {ps === 'PENDING' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              Đang chờ admin xét duyệt...
            </p>
          )}
          {ps === 'PUBLISHED' && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={14} /> Series đã được xuất bản
            </div>
          )}
          {ps === 'REJECTED' && (
            <p className="mt-2 text-xs text-rose-500">Series bị từ chối. Chỉnh sửa và gửi lại.</p>
          )}
        </Card>
      </div>

      {/* Edit form */}
      <Card>
        <SectionTitle>Thông tin series</SectionTitle>
        <form onSubmit={save} className="space-y-4">
          <Field label="Tên truyện *">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} required className="input w-full" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên tiếng Anh">
              <input value={form.titleEnglish} onChange={(e) => set('titleEnglish', e.target.value)} className="input w-full" placeholder="English title" />
            </Field>
            <Field label="Tên gốc">
              <input value={form.titleNative} onChange={(e) => set('titleNative', e.target.value)} className="input w-full" placeholder="原作タイトル" />
            </Field>
          </div>
          <Field label="Mô tả">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="input w-full" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
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
