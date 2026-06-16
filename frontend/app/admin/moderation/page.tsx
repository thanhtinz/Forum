'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Report { id: string; type: string; reason: string; targetType: string; targetId: string; status: string; createdAt: string;
  reporter?: { username: string }; reportedUser?: { username: string }; }
const STATUSES = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];

export default function AdminModeration() {
  const [status, setStatus] = useState('PENDING');
  const [reports, setReports] = useState<Report[]>([]);
  const [msg, setMsg] = useState('');
  const [censor, setCensor] = useState('');
  const [censorMsg, setCensorMsg] = useState('');
  const [autoBest, setAutoBest] = useState(10);
  const [autoBestMsg, setAutoBestMsg] = useState('');
  const [queue, setQueue] = useState<{ threads: any[]; posts: any[] }>({ threads: [], posts: [] });
  const [approvalThr, setApprovalThr] = useState(0);
  const [approvalMsg, setApprovalMsg] = useState('');

  function load() {
    api.get<{ data: Report[] }>(`/admin/reports?status=${status}`).then((r) => setReports(r.data)).catch((e) => setMsg(e.message));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  function loadQueue() { api.get<{ threads: any[]; posts: any[] }>('/forum/admin/approval').then(setQueue).catch(() => {}); }
  useEffect(() => {
    api.get<{ words: string[] }>('/forum/admin/censor').then((r) => setCensor((r.words || []).join(', '))).catch(() => {});
    api.get<{ threshold: number }>('/forum/admin/auto-best').then((r) => setAutoBest(r.threshold)).catch(() => {});
    api.get<{ threshold: number }>('/forum/admin/approval-config').then((r) => setApprovalThr(r.threshold)).catch(() => {});
    loadQueue();
  }, []);

  async function saveApprovalThr() {
    try { const r = await api.post<{ threshold: number }>('/forum/admin/approval-config', { threshold: approvalThr }); setApprovalThr(r.threshold); setApprovalMsg('Đã lưu ✓'); setTimeout(() => setApprovalMsg(''), 2500); }
    catch (e: any) { setApprovalMsg(e.message); }
  }
  const approveThread = async (id: string) => { try { await api.post(`/forum/admin/approval/thread/${id}/approve`, {}); loadQueue(); } catch {} };
  const approvePost = async (id: string) => { try { await api.post(`/forum/admin/approval/post/${id}/approve`, {}); loadQueue(); } catch {} };
  const reject = async (kind: 'thread' | 'post', id: string) => { try { await api.del(`/forum/admin/approval/${kind}/${id}`); loadQueue(); } catch {} };

  async function saveCensor() {
    const words = censor.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
    try { const r = await api.post<{ words: string[] }>('/forum/admin/censor', { words }); setCensor((r.words || []).join(', ')); setCensorMsg('Đã lưu ✓'); setTimeout(() => setCensorMsg(''), 2500); }
    catch (e: any) { setCensorMsg(e.message); }
  }
  async function saveAutoBest() {
    try { const r = await api.post<{ threshold: number }>('/forum/admin/auto-best', { threshold: autoBest }); setAutoBest(r.threshold); setAutoBestMsg('Đã lưu ✓'); setTimeout(() => setAutoBestMsg(''), 2500); }
    catch (e: any) { setAutoBestMsg(e.message); }
  }

  const resolve = async (id: string, action: 'resolve' | 'dismiss') => {
    try { await api.post(`/admin/reports/${id}/resolve`, { action, modNote: action === 'resolve' ? 'Đã xử lý' : 'Bỏ qua' }); setMsg('OK'); } catch (e: any) { setMsg(e.message); }
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Hàng đợi kiểm duyệt</h1>

      {/* Hàng đợi duyệt bài (FoF Approval) */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Duyệt bài chờ ({queue.threads.length + queue.posts.length})</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-500">Yêu cầu duyệt nếu thành viên có &lt;</span>
            <input type="number" min={0} className="input w-20" value={approvalThr} onChange={(e) => setApprovalThr(Number(e.target.value))} />
            <span className="text-ink-500">bài (0 = tắt)</span>
            <button onClick={saveApprovalThr} className="btn-primary !py-1 text-xs">Lưu</button>
            {approvalMsg && <span className="text-emerald-600">{approvalMsg}</span>}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {queue.threads.map((t) => (
            <div key={t.id} className="rounded-lg border border-amber-300 p-3 dark:border-amber-700">
              <div className="text-xs text-ink-500">Chủ đề mới · {t.author?.displayName || t.author?.username} · {t.category?.name}</div>
              <div className="font-medium">{t.title}</div>
              <div className="prose prose-sm mt-1 max-w-none line-clamp-3 dark:prose-invert" dangerouslySetInnerHTML={{ __html: t.posts?.[0]?.content || '' }} />
              <div className="mt-2 flex gap-2">
                <button onClick={() => approveThread(t.id)} className="btn-primary !py-1 text-xs">Duyệt</button>
                <button onClick={() => reject('thread', t.id)} className="btn-outline !py-1 text-xs text-red-600">Từ chối</button>
              </div>
            </div>
          ))}
          {queue.posts.map((p) => (
            <div key={p.id} className="rounded-lg border border-amber-300 p-3 dark:border-amber-700">
              <div className="text-xs text-ink-500">Trả lời · {p.author?.displayName || p.author?.username} · trong "{p.thread?.title}"</div>
              <div className="prose prose-sm mt-1 max-w-none line-clamp-3 dark:prose-invert" dangerouslySetInnerHTML={{ __html: p.content }} />
              <div className="mt-2 flex gap-2">
                <button onClick={() => approvePost(p.id)} className="btn-primary !py-1 text-xs">Duyệt</button>
                <button onClick={() => reject('post', p.id)} className="btn-outline !py-1 text-xs text-red-600">Từ chối</button>
              </div>
            </div>
          ))}
          {queue.threads.length + queue.posts.length === 0 && <p className="text-sm text-ink-500">Không có bài chờ duyệt.</p>}
        </div>
      </div>

      {/* Tự chọn câu trả lời hay nhất theo reaction */}
      <div className="card p-4">
        <h2 className="font-semibold">Tự chọn câu trả lời hay nhất</h2>
        <p className="mt-0.5 text-xs text-ink-500">Khi một trả lời đạt đủ số lượt thích, hệ thống tự gắn "câu trả lời hay nhất" (đặt 0 để tắt). Lựa chọn thủ công của chủ thớt/mod luôn được ưu tiên.</p>
        <div className="mt-2 flex items-center gap-2">
          <input type="number" min={0} className="input w-28" value={autoBest} onChange={(e) => setAutoBest(Number(e.target.value))} />
          <span className="text-sm text-ink-500">lượt thích</span>
          <button onClick={saveAutoBest} className="btn-primary !py-1.5 text-sm">Lưu</button>
          {autoBestMsg && <span className="text-sm text-emerald-600">{autoBestMsg}</span>}
        </div>
      </div>

      {/* Bộ lọc từ cấm (FoF Filter) */}
      <div className="card p-4">
        <h2 className="font-semibold">Bộ lọc từ cấm</h2>
        <p className="mt-0.5 text-xs text-ink-500">Các từ này sẽ bị che bằng *** trong bài viết/trả lời. Ngăn cách bằng dấu phẩy.</p>
        <textarea className="input mt-2 resize-y" rows={3} value={censor} onChange={(e) => setCensor(e.target.value)} placeholder="từ1, từ2, từ3…" />
        <div className="mt-2 flex items-center gap-3">
          <button onClick={saveCensor} className="btn-primary !py-1.5 text-sm">Lưu danh sách</button>
          {censorMsg && <span className="text-sm text-emerald-600">{censorMsg}</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-lg px-3 py-1.5 text-sm ${status === s ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{s}</button>
        ))}
      </div>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}
      <div className="space-y-2">
        {reports.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="chip bg-red-100 text-red-700">{r.type}</span>
              <span className="text-ink-500">{r.targetType}#{r.targetId.slice(0, 8)}</span>
              <span className="text-ink-400">· báo bởi {r.reporter?.username || '?'}{r.reportedUser ? ` → ${r.reportedUser.username}` : ''}</span>
            </div>
            <p className="mt-2 text-sm">{r.reason}</p>
            {status === 'PENDING' && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => resolve(r.id, 'resolve')} className="btn-primary !py-1 text-xs">Xử lý</button>
                <button onClick={() => resolve(r.id, 'dismiss')} className="btn-outline !py-1 text-xs">Bỏ qua</button>
              </div>
            )}
          </div>
        ))}
        {reports.length === 0 && <div className="card p-6 text-center text-ink-500">Không có báo cáo.</div>}
      </div>
    </div>
  );
}
