'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const PREFIXES = ['NONE', 'FREE', 'PAID', 'GUIDE', 'DISCUSSION', 'SHOWCASE', 'REQUEST', 'ANNOUNCEMENT'];

export default function NewThreadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState({ categoryId: '', title: '', content: '', prefix: 'NONE' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get<any[]>('/forum/categories').then((c) => { setCats(c); if (c[0]) setForm((f) => ({ ...f, categoryId: c[0].id })); }).catch(() => {}); }, []);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để đăng bài.</div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const t = await api.post<{ slug: string }>('/forum/threads', { ...form, prefix: form.prefix === 'NONE' ? undefined : form.prefix });
      router.push(`/thread?slug=${t.slug}`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Đăng bài mới</h1>
      <form onSubmit={submit} className="card space-y-3 p-5">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">Chuyên mục
            <select className="input mt-1" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Tiền tố
            <select className="input mt-1" value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })}>
              {PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <input className="input" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="input resize-y" rows={10} placeholder="Nội dung (hỗ trợ Markdown)…" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        {err && <p className="text-sm text-red-500">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.back()} className="btn-outline">Hủy</button>
          <button className="btn-primary" disabled={busy || !form.title || !form.categoryId}>{busy ? 'Đang đăng…' : 'Đăng bài'}</button>
        </div>
      </form>
    </div>
  );
}
