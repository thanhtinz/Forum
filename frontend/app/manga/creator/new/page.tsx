'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronLeft } from 'lucide-react';
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
        ageRating: Number(form.ageRating),
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

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
            <Link href="/manga/creator"><Btn variant="outline">Huỷ</Btn></Link>
            <Btn type="submit" disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo series'}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
