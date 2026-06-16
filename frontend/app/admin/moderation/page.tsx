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

  function load() {
    api.get<{ data: Report[] }>(`/admin/reports?status=${status}`).then((r) => setReports(r.data)).catch((e) => setMsg(e.message));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => { api.get<{ words: string[] }>('/forum/admin/censor').then((r) => setCensor((r.words || []).join(', '))).catch(() => {}); }, []);

  async function saveCensor() {
    const words = censor.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
    try { const r = await api.post<{ words: string[] }>('/forum/admin/censor', { words }); setCensor((r.words || []).join(', ')); setCensorMsg('Đã lưu ✓'); setTimeout(() => setCensorMsg(''), 2500); }
    catch (e: any) { setCensorMsg(e.message); }
  }

  const resolve = async (id: string, action: 'resolve' | 'dismiss') => {
    try { await api.post(`/admin/reports/${id}/resolve`, { action, modNote: action === 'resolve' ? 'Đã xử lý' : 'Bỏ qua' }); setMsg('OK'); } catch (e: any) { setMsg(e.message); }
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Hàng đợi kiểm duyệt</h1>

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
