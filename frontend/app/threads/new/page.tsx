'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import TipTapEditor from '@/components/TipTapEditor';
import { Sparkles, Lock, FileClock, Trash2 } from 'lucide-react';
import { GATE_OPTIONS, needLike, needComment, needGem } from '@/lib/constants';

// Tạo body cho section nội dung ẩn theo gateType
function buildHiddenBody(postId: string, content: string, gate: string, like: number, comment: number, gem: number, label?: string) {
  const body: any = { postId, contentRaw: content, gateType: gate };
  if (label?.trim()) body.label = label.trim();
  if (needLike(gate)) body.likeRequired = Math.max(1, like);
  if (needComment(gate)) body.commentRequired = Math.max(1, comment);
  if (needGem(gate)) body.gemPrice = Math.max(1, gem);
  return body;
}

// Bỏ thẻ HTML để gửi văn bản thuần cho AI
function htmlToText(html: string): string {
  if (typeof document === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

interface Prefix { id: string; label: string; color?: string | null }

export default function NewThreadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [prefixes, setPrefixes] = useState<Prefix[]>([]);
  const [form, setForm] = useState({ categoryId: '', title: '', content: '', prefixId: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  // Poll
  const [pollOn, setPollOn] = useState(false);
  const [poll, setPoll] = useState({ question: '', multiple: false, options: ['', ''] });
  // Nội dung ẩn
  const [hiddenOn, setHiddenOn] = useState(false);
  const [hidden, setHidden] = useState({ content: '', gateType: 'LIKE_REQUIRED', likeRequired: 1, commentRequired: 1, gemPrice: 10, label: '' });
  // Nháp của tôi
  const [drafts, setDrafts] = useState<any[]>([]);
  // Tags
  const [tagQuery, setTagQuery] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [selectedTags, setSelectedTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  // AI
  const [aiBusy, setAiBusy] = useState('');

  function loadDrafts() {
    api.get<any[]>('/forum/drafts').then((d) => setDrafts((d || []).filter((x) => !x.threadId))).catch(() => {});
  }
  useEffect(() => { loadDrafts(); }, []);

  function restoreDraft(d: any) {
    setForm((f) => ({ ...f, categoryId: d.categoryId || f.categoryId, title: d.title || '', content: d.content || '' }));
    setDraftId(d.id);
    setMsg('Đã khôi phục nháp');
    setTimeout(() => setMsg(''), 2000);
  }
  async function deleteDraft(id: string) {
    await api.del(`/forum/drafts/${id}`).catch(() => {});
    if (draftId === id) setDraftId(undefined);
    loadDrafts();
  }

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

  useEffect(() => { api.get<any[]>('/forum/categories').then((c) => {
    setCats(c);
    const fromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('cat') : null;
    // ưu tiên ?cat= (nếu là danh mục đăng được), rồi tới con đầu tiên / danh mục gốc không có con
    const urlPick = fromUrl && c.find((x: any) => x.id === fromUrl && (x.parentId || !c.some((y: any) => y.parentId === x.id)));
    const selectable = urlPick || c.find((x: any) => x.parentId) || c.find((x: any) => !x.parentId && !c.some((y: any) => y.parentId === x.id));
    if (selectable) setForm((f) => ({ ...f, categoryId: f.categoryId || (selectable as any).id }));
  }).catch(() => {}); }, []);

  // Tag search
  useEffect(() => {
    if (tagQuery.trim().length < 1) { setTagSuggestions([]); return; }
    const t = setTimeout(() => {
      api.get<any[]>(`/forum/tags?q=${encodeURIComponent(tagQuery)}&limit=8`)
        .then((r) => setTagSuggestions((r || []).filter((x) => !selectedTags.find((s) => s.id === x.id))))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [tagQuery, selectedTags]);

  function addTag(tag: { id: string; name: string; color?: string | null }) {
    if (!selectedTags.find((t) => t.id === tag.id)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setTagQuery(''); setTagSuggestions([]);
  }

  // Tải tiền tố theo danh mục đang chọn (admin tạo riêng cho từng danh mục)
  useEffect(() => {
    if (!form.categoryId) { setPrefixes([]); return; }
    api.get<Prefix[]>(`/forum/categories/${form.categoryId}/prefixes`)
      .then((p) => { setPrefixes(p); setForm((f) => ({ ...f, prefixId: p.some((x) => x.id === f.prefixId) ? f.prefixId : '' })); })
      .catch(() => setPrefixes([]));
  }, [form.categoryId]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để đăng bài.</div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const t = await api.post<{ id: string; slug: string; pendingApproval?: boolean }>('/forum/threads', { ...form, prefixId: form.prefixId || undefined, tagIds: selectedTags.map((x) => x.id) });
      if (t.pendingApproval) { if (draftId) await api.del(`/forum/drafts/${draftId}`).catch(() => {}); alert('Bài viết của bạn đang chờ kiểm duyệt và sẽ hiển thị sau khi được duyệt.'); router.push('/'); return; }
      if (pollOn) {
        const opts = poll.options.map((o) => o.trim()).filter(Boolean);
        if (poll.question.trim() && opts.length >= 2) {
          await api.post(`/forum/threads/${t.id}/poll`, { question: poll.question, options: opts, multiple: poll.multiple }).catch(() => {});
        }
      }
      // Nội dung ẩn → tạo section gắn vào bài gốc
      if (hiddenOn && hidden.content.trim()) {
        try {
          const ps = await api.get<{ data: { id: string }[] }>(`/forum/threads/${t.id}/posts?limit=1`);
          const firstId = ps?.data?.[0]?.id;
          if (firstId) {
            await api.post('/hidden-content/sections', buildHiddenBody(firstId, hidden.content, hidden.gateType, hidden.likeRequired, hidden.commentRequired, hidden.gemPrice, hidden.label));
          }
        } catch { /* không chặn đăng bài */ }
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

      {drafts.length > 0 && (
        <div className="card mb-3 p-3">
          <div className="mb-1 flex items-center gap-1 text-sm font-medium"><FileClock size={15} /> Nháp của tôi</div>
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {drafts.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <button type="button" onClick={() => restoreDraft(d)} className="min-w-0 flex-1 truncate text-left hover:text-brand-600" title="Khôi phục nháp này">
                  {d.title || '(không tiêu đề)'} <span className="text-xs text-ink-400">· {new Date(d.updatedAt).toLocaleString('vi')}</span>
                </button>
                <button type="button" onClick={() => deleteDraft(d.id)} className="text-red-500 hover:text-red-600" title="Xoá nháp"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="card space-y-3 p-5">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">Chuyên mục
            <select className="input mt-1" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {cats.filter((c: any) => !c.parentId).map((parent: any) => {
                const children = cats.filter((c: any) => c.parentId === parent.id);
                // Danh mục cha có con -> optgroup tiêu đề (không chọn được), chỉ con chọn được
                if (children.length > 0) {
                  return <optgroup key={parent.id} label={parent.name}>{children.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>;
                }
                // Danh mục cấp gốc không có con -> chọn trực tiếp
                return <option key={parent.id} value={parent.id}>{parent.name}</option>;
              })}
            </select>
          </label>
          <label className="text-sm">Tiền tố
            <select className="input mt-1" value={form.prefixId} onChange={(e) => setForm({ ...form, prefixId: e.target.value })} disabled={prefixes.length === 0}>
              <option value="">{prefixes.length === 0 ? '— Danh mục chưa có tiền tố —' : '— Không dùng —'}</option>
              {prefixes.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
        </div>

        {/* Tag picker */}
        <div className="relative">
          <label className="text-sm font-medium">Thẻ (tags)</label>
          <div className="input mt-1 flex flex-wrap gap-1.5 p-1.5">
            {selectedTags.map((t) => (
              <span key={t.id} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: t.color ? t.color + '22' : '#6366f111', color: t.color || '#6366f1' }}>
                #{t.name}
                <button type="button" onClick={() => setSelectedTags((prev) => prev.filter((x) => x.id !== t.id))} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
              </span>
            ))}
            {selectedTags.length < 5 && (
              <input
                type="text"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder={selectedTags.length === 0 ? 'Tìm thẻ…' : ''}
                className="min-w-[80px] flex-1 bg-transparent text-sm outline-none"
              />
            )}
          </div>
          {tagSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-900">
              {tagSuggestions.map((t) => (
                <button key={t.id} type="button" onMouseDown={() => addTag(t)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color || '#6366f1' }} />
                  #{t.name}
                </button>
              ))}
            </div>
          )}
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

        {/* Nội dung ẩn */}
        <div className="rounded-lg border border-ink-200 p-3 dark:border-ink-800">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={hiddenOn} onChange={(e) => setHiddenOn(e.target.checked)} />
            <Lock size={14} /> Thêm nội dung ẩn
          </label>
          {hiddenOn && (
            <div className="mt-3 space-y-2">
              <TipTapEditor value={hidden.content} onChange={(html) => setHidden({ ...hidden, content: html })} placeholder="Nội dung sẽ bị ẩn cho tới khi mở khoá…" />
              <input className="input" placeholder="Nhãn nội dung ẩn (tuỳ chọn)" value={hidden.label} onChange={(e) => setHidden({ ...hidden, label: e.target.value })} />
              <div className="flex flex-wrap items-center gap-2">
                <select className="input w-auto" value={hidden.gateType} onChange={(e) => setHidden({ ...hidden, gateType: e.target.value })}>
                  {GATE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                {needLike(hidden.gateType) && <label className="text-xs text-ink-500">Like ≥ <input type="number" min={1} className="input ml-1 w-16" value={hidden.likeRequired} onChange={(e) => setHidden({ ...hidden, likeRequired: Number(e.target.value) })} /></label>}
                {needComment(hidden.gateType) && <label className="text-xs text-ink-500">Bình luận ≥ <input type="number" min={1} className="input ml-1 w-16" value={hidden.commentRequired} onChange={(e) => setHidden({ ...hidden, commentRequired: Number(e.target.value) })} /></label>}
                {needGem(hidden.gateType) && <label className="text-xs text-ink-500">Giá Gem <input type="number" min={1} className="input ml-1 w-20" value={hidden.gemPrice} onChange={(e) => setHidden({ ...hidden, gemPrice: Number(e.target.value) })} /></label>}
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
