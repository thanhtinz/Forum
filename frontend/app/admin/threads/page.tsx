'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Pin, Lock, EyeOff, FolderInput, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, Btn, Notice, Empty } from '@/components/admin/ui';

interface Cat { id: string; name: string; parentId?: string | null }
interface AdminThread {
  id: string;
  title: string;
  slug: string;
  isPinned: boolean;
  isLocked: boolean;
  isHidden: boolean;
  isApproved: boolean;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  createdAt: string;
  author?: { id: string; username: string; displayName?: string | null };
  category?: { id: string; name: string };
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'hidden', label: 'Đã ẩn' },
  { value: 'locked', label: 'Đã khoá' },
];
const SORT_OPTIONS = [
  { value: 'lastPost', label: 'Hoạt động mới nhất' },
  { value: 'createdAt', label: 'Mới đăng' },
  { value: 'views', label: 'Lượt xem' },
  { value: 'likes', label: 'Lượt thích' },
  { value: 'replies', label: 'Trả lời' },
];

export default function AdminThreads() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [threads, setThreads] = useState<AdminThread[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('lastPost');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => { api.get<Cat[]>('/forum/categories').then(setCats).catch(() => {}); }, []);

  function load(p = page) {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (categoryId) params.set('categoryId', categoryId);
    if (status !== 'all') params.set('status', status);
    params.set('sortBy', sortBy);
    params.set('page', String(p));
    params.set('limit', '20');
    api.get<{ data: AdminThread[]; meta: { totalPages: number } }>(`/forum/admin/threads?${params.toString()}`)
      .then((r) => { setThreads(r.data); setTotalPages(r.meta.totalPages); setPage(p); })
      .catch((e) => setMsg(e.message));
  }
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [categoryId, status, sortBy]);

  const act = async (id: string, fn: () => Promise<any>, ok = 'Đã cập nhật') => {
    setBusy(id); setMsg('');
    try { await fn(); setMsg(ok); } catch (e: any) { setMsg(e.message); }
    finally { setBusy(''); load(page); }
  };

  function moveThread(t: AdminThread) {
    if (!cats.length) return;
    const names = cats.map((c) => `${c.name} (${c.id})`).join('\n');
    const id = prompt(`Chuyển "${t.title}" sang chuyên mục nào? Nhập đúng ID:\n${names}`, t.category?.id || '');
    if (!id || !cats.some((c) => c.id === id)) return;
    act(t.id, () => api.post(`/forum/threads/${t.id}/move`, { categoryId: id }), 'Đã chuyển chuyên mục');
  }

  function deleteThread(t: AdminThread) {
    if (!confirm(`Xoá vĩnh viễn chủ đề "${t.title}"? Toàn bộ bài trả lời sẽ bị xoá theo. Không thể hoàn tác.`)) return;
    act(t.id, () => api.del(`/forum/admin/threads/${t.id}`), 'Đã xoá chủ đề');
  }

  return (
    <div className="space-y-5">
      <PageHeader icon={<MessageSquare size={20} />} title="Quản lý bài viết" desc="Tìm, lọc và kiểm duyệt toàn bộ chủ đề trong diễn đàn." />

      <Card pad={false} className="flex flex-wrap gap-2 p-3">
        <input className="input min-w-[200px] flex-1" placeholder="Tìm theo tiêu đề…" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <select className="input w-auto" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Tất cả chuyên mục</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="input w-auto" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Btn onClick={() => load(1)}>Tìm</Btn>
      </Card>

      {msg && <Notice kind={/lỗi|error|Không/i.test(msg) ? 'error' : 'success'}>{msg}</Notice>}

      <Card pad={false} className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
            <tr>
              <th className="p-3">Chủ đề</th>
              <th className="p-3">Tác giả</th>
              <th className="p-3">Chuyên mục</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Xem / Trả lời</th>
              <th className="p-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {threads.map((t) => (
              <tr key={t.id} className="border-b border-ink-100 align-top dark:border-ink-800">
                <td className="p-3">
                  <Link href={`/thread?slug=${t.slug}`} target="_blank" className="font-medium hover:text-brand-600">{t.title}</Link>
                  <div className="text-xs text-ink-400">{new Date(t.createdAt).toLocaleString('vi')}</div>
                </td>
                <td className="p-3">{t.author?.displayName || t.author?.username || '—'}</td>
                <td className="p-3">{t.category?.name || '—'}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {!t.isApproved && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950/40">Chờ duyệt</span>}
                    {t.isHidden && <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-950/40">Đã ẩn</span>}
                    {t.isLocked && <span className="chip bg-ink-200 text-ink-700 dark:bg-ink-800">Đã khoá</span>}
                    {t.isPinned && <span className="chip bg-brand-100 text-brand-700 dark:bg-brand-950/40">Ghim</span>}
                    {t.isApproved && !t.isHidden && !t.isLocked && !t.isPinned && <span className="text-xs text-ink-400">Bình thường</span>}
                  </div>
                </td>
                <td className="p-3 tabular-nums">{t.viewCount} / {t.replyCount}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {!t.isApproved && (
                      <>
                        <button disabled={busy === t.id} onClick={() => act(t.id, () => api.post(`/forum/admin/approval/thread/${t.id}/approve`), 'Đã duyệt bài')}
                          className="btn-outline inline-flex items-center gap-1 !py-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> Duyệt</button>
                        <button disabled={busy === t.id} onClick={() => { if (confirm(`Từ chối & xoá vĩnh viễn "${t.title}"?`)) act(t.id, () => api.del(`/forum/admin/approval/thread/${t.id}`), 'Đã từ chối & xoá'); }}
                          className="btn-outline inline-flex items-center gap-1 !py-1 text-xs text-red-600"><XCircle size={12} /> Từ chối</button>
                      </>
                    )}
                    <button disabled={busy === t.id} onClick={() => act(t.id, () => api.post(`/forum/threads/${t.id}/pin`, { pin: !t.isPinned }), t.isPinned ? 'Đã bỏ ghim' : 'Đã ghim')}
                      className="btn-outline inline-flex items-center gap-1 !py-1 text-xs"><Pin size={12} /> {t.isPinned ? 'Bỏ ghim' : 'Ghim'}</button>
                    <button disabled={busy === t.id} onClick={() => act(t.id, () => api.post(`/forum/threads/${t.id}/lock`, { lock: !t.isLocked }), t.isLocked ? 'Đã mở khoá' : 'Đã khoá')}
                      className="btn-outline inline-flex items-center gap-1 !py-1 text-xs"><Lock size={12} /> {t.isLocked ? 'Mở khoá' : 'Khoá'}</button>
                    <button disabled={busy === t.id} onClick={() => act(t.id, () => api.post(`/forum/threads/${t.id}/hide`, { hide: !t.isHidden }), t.isHidden ? 'Đã hiện lại' : 'Đã ẩn')}
                      className="btn-outline inline-flex items-center gap-1 !py-1 text-xs text-red-600"><EyeOff size={12} /> {t.isHidden ? 'Hiện lại' : 'Ẩn'}</button>
                    <button disabled={busy === t.id} onClick={() => moveThread(t)}
                      className="btn-outline inline-flex items-center gap-1 !py-1 text-xs"><FolderInput size={12} /> Chuyển mục</button>
                    <button disabled={busy === t.id} onClick={() => deleteThread(t)}
                      className="btn-outline inline-flex items-center gap-1 !py-1 text-xs text-red-600"><Trash2 size={12} /> Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {threads.length === 0 && <Empty icon={<MessageSquare size={28} />} title="Không có chủ đề nào khớp bộ lọc." />}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Trước</Btn>
          <span className="text-sm text-ink-500">Trang {page}/{totalPages}</span>
          <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Sau →</Btn>
        </div>
      )}
    </div>
  );
}
