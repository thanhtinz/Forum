'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, ChevronLeft, ImagePlus, ChevronDown, ChevronUp, Info,
  Globe, Tag, Settings, Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Card, Btn, Field, Notice } from '@/components/admin/ui';

type MediaTypeKey = 'MANHUA';

const FORMAT_OPTIONS: { v: string; l: string }[] = [
  { v: 'MANHUA',   l: 'Truyện tranh (Manhua)' },
  { v: 'MANHWA',   l: 'Webtoon (Manhwa)' },
  { v: 'ONE_SHOT', l: 'One-shot' },
  { v: 'NOVEL',    l: 'Tiểu thuyết / Novel' },
];

const STATUS_OPTIONS = [
  { v: 'RELEASING', l: 'Đang tiến hành' },
  { v: 'FINISHED',  l: 'Hoàn thành' },
  { v: 'NOT_YET_RELEASED', l: 'Sắp ra mắt' },
  { v: 'HIATUS',    l: 'Tạm ngưng' },
  { v: 'CANCELLED', l: 'Đã hủy' },
];

const COUNTRY_OPTIONS = [
  { v: 'CN', l: 'Trung Quốc' },
  { v: 'JP', l: 'Nhật Bản' },
  { v: 'KR', l: 'Hàn Quốc' },
  { v: 'VN', l: 'Việt Nam' },
  { v: 'US', l: 'Mỹ' },
  { v: 'OTHER', l: 'Khác' },
];

function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
          <span className="text-brand-600">{icon}</span>{title}
        </span>
        {open ? <ChevronUp size={16} className="text-ink-400" /> : <ChevronDown size={16} className="text-ink-400" />}
      </button>
      {open && <div className="border-t border-ink-100 px-5 pb-5 pt-4 dark:border-ink-800">{children}</div>}
    </div>
  );
}

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

export default function NewSeriesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const coverRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', titleEnglish: '', titleNative: '',
    synonymsRaw: '',
    description: '',
    author: '', artist: '', publisher: '',
    language: 'vi', ageRating: '0',
    format: '', status: 'RELEASING', seasonYear: '',
    countryOfOrigin: 'CN',
    tagsRaw: '',
    seoTitle: '', seoDescription: '', seoKeywordsRaw: '',
  });
  const [mediaType] = useState<MediaTypeKey>('MANHUA');
  const [allowComments, setAllowComments] = useState(true);
  const [allowRating, setAllowRating] = useState(true);
  const [allowFollow, setAllowFollow] = useState(true);
  const [genres, setGenres] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<any[]>(`/anime/genres?type=${mediaType}`).then(setGenres).catch(() => {});
  }, [mediaType]);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setCoverFile(f); setCoverPreview(URL.createObjectURL(f));
  }

  function pickBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBannerFile(f); setBannerPreview(URL.createObjectURL(f));
  }

  function toggleGenre(g: string) {
    setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Nhập tên truyện'); return; }
    setBusy(true); setErr('');
    try {
      const r = await api.post<{ id: string }>('/creator/manga', {
        title: form.title.trim(),
        titleEnglish: form.titleEnglish.trim() || undefined,
        titleNative: form.titleNative.trim() || undefined,
        synonyms: form.synonymsRaw.split(',').map((x) => x.trim()).filter(Boolean),
        description: form.description.trim() || undefined,
        author: form.author.trim() || undefined,
        artist: form.artist.trim() || undefined,
        publisher: form.publisher.trim() || undefined,
        language: form.language,
        ageRating: Number(form.ageRating),
        format: form.format || undefined,
        status: form.status,
        seasonYear: form.seasonYear ? Number(form.seasonYear) : undefined,
        countryOfOrigin: form.countryOfOrigin || undefined,
        type: mediaType,
        genreNames: selectedGenres.length ? selectedGenres : undefined,
        tags: form.tagsRaw.split(',').map((x) => x.trim()).filter(Boolean),
        allowComments,
        allowRating,
        allowFollow,
        seoTitle: form.seoTitle.trim() || undefined,
        seoDescription: form.seoDescription.trim() || undefined,
        seoKeywords: form.seoKeywordsRaw.split(',').map((x) => x.trim()).filter(Boolean),
      });

      const base = process.env.NEXT_PUBLIC_API_URL ?? '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('forum_token') : null;
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      if (coverFile) {
        const fd = new FormData(); fd.append('file', coverFile);
        await fetch(`${base}/api/creator/manga/${r.id}/cover`, { method: 'POST', headers: authHeaders, body: fd }).catch(() => {});
      }
      if (bannerFile) {
        const fd = new FormData(); fd.append('file', bannerFile);
        await fetch(`${base}/api/creator/manga/${r.id}/banner`, { method: 'POST', headers: authHeaders, body: fd }).catch(() => {});
      }

      router.push(`/manga/creator/edit?id=${r.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  if (loading) return null;
  if (!user) return <div className="p-10 text-center">Đăng nhập để tiếp tục.</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/manga/creator" className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold">Tạo series mới</h1>
          <p className="text-xs text-ink-500">Điền thông tin và tạo truyện của bạn</p>
        </div>
      </div>

      {err && <Notice kind="error">{err}</Notice>}

      <form onSubmit={submit} className="space-y-4">

        {/* 1. Ảnh & Banner */}
        <Section title="Hình ảnh" icon={<ImagePlus size={15} />}>
          {/* Banner */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-ink-500">Banner (tuỳ chọn, tỉ lệ 16:5)</p>
            <button type="button" onClick={() => bannerRef.current?.click()}
              className="relative flex h-24 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-ink-300 bg-ink-50 text-ink-400 transition hover:border-brand-400 dark:border-ink-700 dark:bg-ink-800">
              {bannerPreview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={bannerPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                : <span className="flex flex-col items-center gap-1"><ImagePlus size={20} /><span className="text-[11px]">Chọn banner</span></span>}
            </button>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={pickBanner} />
          </div>

          {/* Cover */}
          <p className="mb-1.5 text-xs font-medium text-ink-500">Ảnh bìa (tỉ lệ 3:4, tối đa 5 MB)</p>
          <div className="flex items-start gap-4">
            <button type="button" onClick={() => coverRef.current?.click()}
              className="relative flex h-40 w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 border-dashed border-ink-300 bg-ink-50 text-ink-400 transition hover:border-brand-400 dark:border-ink-700 dark:bg-ink-800">
              {coverPreview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={coverPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                : <><ImagePlus size={22} /><span className="text-[11px]">Chọn ảnh</span></>}
            </button>
            <div className="flex-1 space-y-2 text-xs text-ink-500">
              <p>Ảnh bìa giúp series nổi bật hơn.</p>
              <Btn type="button" size="sm" variant="outline" onClick={() => coverRef.current?.click()}>
                <ImagePlus size={13} /> {coverPreview ? 'Đổi ảnh bìa' : 'Chọn ảnh bìa'}
              </Btn>
              {coverPreview && (
                <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  className="block text-rose-500 hover:underline">Bỏ ảnh</button>
              )}
            </div>
          </div>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />
        </Section>

        {/* 2. Thông tin cơ bản */}
        <Section title="Thông tin cơ bản" icon={<Info size={15} />}>
          <div className="space-y-3">
            <Field label="Tên truyện *" hint="Tên hiển thị chính">
              <input value={form.title} onChange={(e) => set('title', e.target.value)} required className="input w-full" placeholder="Nhập tên truyện..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tên tiếng Anh">
                <input value={form.titleEnglish} onChange={(e) => set('titleEnglish', e.target.value)} className="input w-full" placeholder="English title" />
              </Field>
              <Field label="Tên gốc">
                <input value={form.titleNative} onChange={(e) => set('titleNative', e.target.value)} className="input w-full" placeholder="原作タイトル / 原名" />
              </Field>
            </div>
            <Field label="Tên khác (Alternative Names)" hint="Phân cách bằng dấu phẩy">
              <input value={form.synonymsRaw} onChange={(e) => set('synonymsRaw', e.target.value)} className="input w-full" placeholder="Tên 1, Tên 2, Tên 3..." />
            </Field>
            <Field label="Mô tả / Tóm tắt">
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className="input w-full" placeholder="Tóm tắt nội dung series..." />
            </Field>
          </div>
        </Section>

        {/* 3. Tác giả */}
        <Section title="Tác giả & Nhóm dịch" icon={<BookOpen size={15} />}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tác giả (Author)">
              <input value={form.author} onChange={(e) => set('author', e.target.value)} className="input w-full" placeholder="Tên tác giả" />
            </Field>
            <Field label="Họa sĩ (Artist)">
              <input value={form.artist} onChange={(e) => set('artist', e.target.value)} className="input w-full" placeholder="Tên họa sĩ" />
            </Field>
            <Field label="Nhóm dịch">
              <input value={form.publisher} onChange={(e) => set('publisher', e.target.value)} className="input w-full" placeholder="Nhóm scan / dịch..." />
            </Field>
            <Field label="Năm phát hành">
              <input type="number" value={form.seasonYear} onChange={(e) => set('seasonYear', e.target.value)} className="input w-full" placeholder="2024" min="1900" max="2099" />
            </Field>
          </div>
        </Section>

        {/* 4. Phân loại */}
        <Section title="Phân loại" icon={<Tag size={15} />}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quốc gia">
                <select value={form.countryOfOrigin} onChange={(e) => set('countryOfOrigin', e.target.value)} className="input w-full">
                  {COUNTRY_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Định dạng">
                <select value={form.format} onChange={(e) => set('format', e.target.value)} className="input w-full">
                  <option value="">— Chọn định dạng —</option>
                  {FORMAT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Tình trạng">
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input w-full">
                  {STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
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
              <Field label="Ngôn ngữ bản dịch">
                <select value={form.language} onChange={(e) => set('language', e.target.value)} className="input w-full">
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </Field>
            </div>

            {/* Thể loại */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-500">Thể loại</p>
              {genres.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <button key={g.id} type="button" onClick={() => toggleGenre(g.name)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        selectedGenres.includes(g.name)
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300'
                      }`}>
                      {g.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-400">Chưa có thể loại. Admin cần tạo trong <a href="/admin/genres" className="text-brand-600 hover:underline">Thể loại</a>.</p>
              )}
              {selectedGenres.length > 0 && <p className="mt-1.5 text-[11px] text-ink-400">Đã chọn: {selectedGenres.join(', ')}</p>}
            </div>

            {/* Tags */}
            <Field label="Tags" hint="Từ khoá phân cách bằng dấu phẩy (vd: harem, hệ thống, tu tiên)">
              <input value={form.tagsRaw} onChange={(e) => set('tagsRaw', e.target.value)} className="input w-full" placeholder="Tag 1, Tag 2, Tag 3..." />
            </Field>
          </div>
        </Section>

        {/* 5. Cài đặt truyện */}
        <Section title="Cài đặt truyện" icon={<Settings size={15} />}>
          <div className="space-y-2">
            <Toggle label="Cho phép bình luận" checked={allowComments} onChange={setAllowComments} />
            <Toggle label="Cho phép đánh giá" hint="Người đọc có thể cho điểm truyện" checked={allowRating} onChange={setAllowRating} />
            <Toggle label="Cho phép theo dõi" hint="Người đọc có thể thêm vào danh sách" checked={allowFollow} onChange={setAllowFollow} />
            {Number(form.ageRating) >= 18 && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                <Info size={13} /> Truyện 18+ sẽ được đánh dấu và chỉ hiển thị với người dùng đủ tuổi.
              </div>
            )}
          </div>
        </Section>

        {/* 6. SEO */}
        <Section title="SEO & Tìm kiếm" icon={<Search size={15} />} defaultOpen={false}>
          <div className="space-y-3">
            <Field label="URL Slug" hint="Tự động tạo từ tên truyện nếu để trống">
              <input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} className="input w-full" placeholder="ten-truyen-cua-ban" />
            </Field>
            <Field label="Meta Title" hint="Tiêu đề hiển thị trên Google (≤ 60 ký tự)">
              <input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} className="input w-full" placeholder="Tiêu đề SEO..." maxLength={200} />
            </Field>
            <Field label="Meta Description" hint="Mô tả ngắn cho Google (≤ 160 ký tự)">
              <textarea value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} rows={2} className="input w-full" placeholder="Mô tả SEO..." maxLength={500} />
            </Field>
            <Field label="Từ khóa SEO" hint="Phân cách bằng dấu phẩy">
              <input value={form.seoKeywordsRaw} onChange={(e) => set('seoKeywordsRaw', e.target.value)} className="input w-full" placeholder="từ khoá 1, từ khoá 2..." />
            </Field>
          </div>
        </Section>

        {/* Submit */}
        <div className="flex items-center justify-between border-t border-ink-100 pt-2 dark:border-ink-800">
          <Link href="/manga/creator">
            <Btn variant="outline">Huỷ</Btn>
          </Link>
          <Btn type="submit" disabled={busy || !form.title.trim()}>
            {busy ? 'Đang tạo...' : 'Tạo series'}
          </Btn>
        </div>
      </form>
    </div>
  );
}
