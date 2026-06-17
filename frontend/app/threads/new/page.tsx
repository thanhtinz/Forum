'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import TipTapEditor from '@/components/TipTapEditor';
import { Sparkles } from 'lucide-react';

// Bỏ thẻ HTML để gửi văn bản thuần cho AI
function htmlToText(html: string): string {
  if (typeof document === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

const PREFIXES = ['NONE', 'FREE', 'PAID', 'GUIDE', 'DISCUSSION', 'SHOWCASE', 'REQUEST', 'ANNOUNCEMENT'];

export default function NewThreadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState({ categoryId: '', title: '', content: '', prefix: 'NONE' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  // Poll
  const [pollOn, setPollOn] = useState(false);
  const [poll, setPoll] = useState({ question: '', multiple: false, options: ['', ''] });
  // AI
  const [aiBusy, setAiBusy] = useState('');

  async function aiTitle() {
    const text = htmlToText(form.content);
    if (!text) { setErr('Hãy viết nội dung trước khi gợi ý tiêu đề.'); return; }
    setErr(''); setAiBusy('title');
    try {
      const res = await api.post<{ result: string }>('/ai/writing/title', { text });
      if (res.result) setForm((f) => ({ ...f, title: res.result.trim() }));
    } catch (e: any) { setErr('AI lỗi: ' + (e?.message || 'không xác định')); }
    finally { setAiBusy(''); }
  }

  async function aiPoll() {
    const text = htmlToText(form.content);
    if (!text) { setErr('Hãy viết nội dung trước khi tạo poll.'); return; }
    setErr(''); setAiBusy('poll');
    try {
      const res = await api.post<{ question: string; options: string[] }>('/ai/writing/poll', { text });
      const opts = (res.options || []).filter(Boolean);
      setPollOn(true);
      setPoll({
        question: res.question || '',
        multiple: false,
        options: opts.length >= 2 ? opts : [...opts, '', ''].slice(0, 2),
      });
    } catch (e: any) { setErr('AI lỗi: ' + (e?.message || 'không xác định')); }
    finally { setAiBusy(''); }
  }

  useEffect(() => { api.get<any[]>('/forum/categories').then((c) => { setCats(c); if (c[0]) setForm((f) => ({ ...f, categoryId: c[0].id })); }).catch(() => {}); }, []);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để đăng bài.</div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const t = await api.post<{ id: string; slug: string; pendingApproval?: boolean }>('/forum/threads', { ...form, prefix: form.prefix === 'NONE' ? undefined : form.prefix });
      if (t.pendingApproval) { if (draftId) await api.del(`/forum/drafts/${draftId}`).catch(() => {}); alert('Bài viết của bạn đang chờ kiểm duyệt và sẽ hiển thị sau khi được duyệt.'); router.push('/'); return; }
      if (pollOn) {
        const opts = poll.options.map((o) => o.trim()).filter(Boolean);
        if (poll.question.trim() && opts.length >= 2) {
          await api.post(`/forum/threads/${t.id}/poll`, { question: poll.question, options: opts, multiple: poll.multiple }).catch(() => {});
        }
      }
      if (draftId) await api.del(`/forum/drafts/${draftId}`).catch(() => {});
      router.push(`/thread?slug=${t.slug}`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function saveDraft() {
    setMsg('');
    try {
      const d = await api.post<{ id: string }>('/forum/drafts', { id: draftId, categoryId: form.categoryId, title: form.title, content: form.content });
      setDraftId(d.id); setMsg('Đã lưu nháp ✓'); setTimeout(() => setMsg(''), 2500);
    } catch (e: any) { setErr(e.message); }
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
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <button type="button" onClick={aiTitle} disabled={!!aiBusy} className="btn-outline flex shrink-0 items-center gap-1 whitespace-nowrap" title="AI gợi ý tiêu đề từ nội dung">
            <Sparkles size={14} /> {aiBusy === 'title' ? 'Đang gợi ý…' : 'AI tiêu đề'}
          </button>
        </div>
        <TipTapEditor value={form.content} onChange={(html) => setForm({ ...form, content: html })} placeholder="Viết nội dung bài đăng…" autosaveKey="new-thread" />

        {/* Bình chọn (Poll) */}
        <div className="rounded-lg border border-ink-200 p-3 dark:border-ink-800">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={pollOn} onChange={(e) => setPollOn(e.target.checked)} /> Thêm bình chọn
            </label>
            <button type="button" onClick={aiPoll} disabled={!!aiBusy} className="flex items-center gap-1 text-xs text-brand-600 disabled:opacity-50" title="Tạo poll từ nội dung bằng AI">
              <Sparkles size={12} /> {aiBusy === 'poll' ? 'Đang tạo…' : 'Tạo poll từ nội dung'}
            </button>
          </div>
          {pollOn && (
            <div className="mt-3 space-y-2">
              <input className="input" placeholder="Câu hỏi bình chọn" value={poll.question} onChange={(e) => setPoll({ ...poll, question: e.target.value })} />
              {poll.options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input" placeholder={`Lựa chọn ${i + 1}`} value={o} onChange={(e) => { const n = [...poll.options]; n[i] = e.target.value; setPoll({ ...poll, options: n }); }} />
                  {poll.options.length > 2 && <button type="button" onClick={() => setPoll({ ...poll, options: poll.options.filter((_, x) => x !== i) })} className="btn-outline !px-2">×</button>}
                </div>
              ))}
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setPoll({ ...poll, options: [...poll.options, ''] })} className="text-xs text-brand-600">+ Thêm lựa chọn</button>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={poll.multiple} onChange={(e) => setPoll({ ...poll, multiple: e.target.checked })} /> Cho chọn nhiều</label>
              </div>
            </div>
          )}
        </div>

        {err && <p className="text-sm text-red-500">{err}</p>}
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.back()} className="btn-outline">Hủy</button>
          <button type="button" onClick={saveDraft} disabled={!form.content && !form.title} className="btn-outline">Lưu nháp</button>
          <button className="btn-primary" disabled={busy || !form.title || !form.categoryId}>{busy ? 'Đang đăng…' : 'Đăng bài'}</button>
        </div>
      </form>
    </div>
  );
}
