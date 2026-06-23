'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { PageHeader, Card, Btn, Field, Notice } from '@/components/admin/ui';

type MediaTypeKey = 'MANGA' | 'MANHUA';

const MEDIA_TYPES: { key: MediaTypeKey; label: string; desc: string }[] = [
  { key: 'MANGA',  label: 'Manga',  desc: 'Truyện tranh Nhật Bản' },
  { key: 'MANHUA', label: 'Manhua', desc: 'Truyện tranh Trung Quốc' },
];

export default function NewSeriesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '', titleEnglish: '', titleNative: '',
    description: '', language: 'vi', ageRating: '0',
  });
  const [mediaType, setMediaType] = useState<MediaTypeKey>('MANGA');
  const [genres, setGenres] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<any[]>(`/anime/genres?type=${mediaType}`).then(setGenres).catch(() => {});
    setSelectedGenres([]);
  }, [mediaType]);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleGenre(g: string) {
    setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Nhập tên truyện'); return; }
    setBusy(true); setErr('');
    try {
      const isOneShot = selectedGenres.some((g) => g.toLowerCase() === 'one-shot');
      const r = await api.post<{ id: string }>('/creator/manga', {
        ...form,
        type: mediaType,
        ageRating: Number(form.ageRating),
        format: isOneShot ? 'ONE_SHOT' : undefined,
        genreNames: selectedGenres.length ? selectedGenres : undefined,
        titleEnglish: form.titleEnglish || undefined,
        titleNative: form.titleNative || undefined,
        description: form.description || undefined,
      });
      router.push(`/manga/creator/edit?id=${r.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  if (loading) return null;
  if (!user) return <div className="p-10 text-center">Đăng nhập để tiếp tục.</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Link href="/manga/creator" className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300">
          <ChevronLeft size={20} />
        </Link>
        <PageHeader icon={<BookOpen size={20} />} title="Tạo series mới" />
      </div>

      {err && <Notice kind="error">{err}</Notice>}

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Tên truyện *" hint="Tên hiển thị chính của series">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} required className="input w-full" placeholder="Nhập tên truyện..." />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên tiếng Anh">
              <input value={form.titleEnglish} onChange={(e) => set('titleEnglish', e.target.value)} className="input w-full" placeholder="English title" />
            </Field>
            <Field label="Tên gốc">
              <input value={form.titleNative} onChange={(e) => set('titleNative', e.target.value)} className="input w-full" placeholder="原作タイトル" />
            </Field>
          </div>

          <Field label="Mô tả / Tóm tắt">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="input w-full" placeholder="Tóm tắt nội dung series..." />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ngôn ngữ bản dịch">
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
                <option value="18">18+ (người lớn)</option>
              </select>
            </Field>
          </div>

          {/* Loại truyện */}
          <div className="rounded-lg border border-ink-100 p-3 dark:border-ink-800">
            <p className="mb-2 text-xs font-medium text-ink-500">Loại truyện</p>
            <div className="flex gap-2">
              {MEDIA_TYPES.map((t) => (
                <label key={t.key} className={`flex flex-1 cursor-pointer flex-col gap-0.5 rounded-lg border-2 p-2.5 transition ${mediaType === t.key ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-ink-200 dark:border-ink-700'}`}>
                  <input type="radio" name="mediatype" checked={mediaType === t.key} onChange={() => setMediaType(t.key)} className="hidden" />
                  <span className={`text-sm font-semibold ${mediaType === t.key ? 'text-brand-700 dark:text-brand-400' : ''}`}>{t.label}</span>
                  <span className="text-[11px] text-ink-400">{t.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Thể loại */}
          <div className="rounded-lg border border-ink-100 p-3 dark:border-ink-800">
            <p className="mb-2 text-xs font-medium text-ink-500">Thể loại</p>
            {genres.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <button key={g.id} type="button" onClick={() => toggleGenre(g.name)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      selectedGenres.includes(g.name)
                        ? 'border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-600'
                        : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:bg-brand-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300'
                    }`}>
                    {g.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-400">Chưa có thể loại cho loại này. Admin cần tạo trong <a href="/admin/genres" className="text-brand-600 hover:underline">Thể loại</a>.</p>
            )}
            {selectedGenres.length > 0 && (
              <p className="mt-2 text-[11px] text-ink-400">Đã chọn: {selectedGenres.join(', ')}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
            <Link href="/manga/creator"><Btn variant="outline">Huỷ</Btn></Link>
            <Btn type="submit" disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo series'}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
