'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronLeft, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { PageHeader, Card, Btn, Field, Notice } from '@/components/admin/ui';

export default function NewSeriesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '', titleEnglish: '', titleNative: '',
    description: '', language: 'vi', ageRating: '0',
  });
  const [isOneShot, setIsOneShot] = useState(false);
  const [mediaType, setMediaType] = useState<'MANGA' | 'MANHUA'>('MANGA');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Nhập tên truyện'); return; }
    setBusy(true); setErr('');
    try {
      const r = await api.post<{ id: string }>('/creator/manga', {
        ...form,
        type: mediaType,
        ageRating: Number(form.ageRating),
        format: isOneShot ? 'ONE_SHOT' : undefined,
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
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              className="input w-full"
              placeholder="Nhập tên truyện..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên tiếng Anh">
              <input
                value={form.titleEnglish}
                onChange={(e) => set('titleEnglish', e.target.value)}
                className="input w-full"
                placeholder="English title"
              />
            </Field>
            <Field label="Tên gốc (Nhật / Hàn / ...)">
              <input
                value={form.titleNative}
                onChange={(e) => set('titleNative', e.target.value)}
                className="input w-full"
                placeholder="原作タイトル"
              />
            </Field>
          </div>

          <Field label="Mô tả / Tóm tắt">
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
              className="input w-full"
              placeholder="Tóm tắt nội dung series..."
            />
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

          {/* Media type */}
          <div className="rounded-lg border border-ink-100 p-3 dark:border-ink-800">
            <p className="mb-2 text-xs font-medium text-ink-500">Loại truyện</p>
            <div className="flex gap-3">
              {(['MANGA', 'MANHUA'] as const).map((t) => (
                <label key={t} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition ${mediaType === t ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-ink-200 dark:border-ink-700'}`}>
                  <input type="radio" name="mediatype" checked={mediaType === t} onChange={() => setMediaType(t)} className="hidden" />
                  <BookOpen size={18} className={mediaType === t ? 'text-brand-600' : 'text-ink-400'} />
                  <div>
                    <p className="text-sm font-medium">{t === 'MANGA' ? 'Manga' : 'Manhua'}</p>
                    <p className="text-xs text-ink-400">{t === 'MANGA' ? 'Truyện tranh Nhật' : 'Truyện tranh Trung Quốc'}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="rounded-lg border border-ink-100 p-3 dark:border-ink-800">
            <p className="mb-2 text-xs font-medium text-ink-500">Định dạng series</p>
            <div className="flex gap-3">
              <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition ${!isOneShot ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-ink-200 dark:border-ink-700'}`}>
                <input type="radio" name="format" checked={!isOneShot} onChange={() => setIsOneShot(false)} className="hidden" />
                <BookOpen size={18} className={!isOneShot ? 'text-brand-600' : 'text-ink-400'} />
                <div>
                  <p className="text-sm font-medium">Series thông thường</p>
                  <p className="text-xs text-ink-400">Nhiều chương, cập nhật liên tục</p>
                </div>
              </label>
              <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition ${isOneShot ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-ink-200 dark:border-ink-700'}`}>
                <input type="radio" name="format" checked={isOneShot} onChange={() => setIsOneShot(true)} className="hidden" />
                <FileText size={18} className={isOneShot ? 'text-brand-600' : 'text-ink-400'} />
                <div>
                  <p className="text-sm font-medium">One-shot</p>
                  <p className="text-xs text-ink-400">Truyện ngắn, chỉ một chương</p>
                </div>
              </label>
            </div>
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
