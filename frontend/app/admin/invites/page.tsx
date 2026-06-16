'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Copy, Trash2, Plus } from 'lucide-react';

interface InviteCode {
  id: string;
  code: string;
  role: string;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  createdAt: string;
  creator: { id: string; username: string; displayName?: string };
  _count: { usedBy: number };
}

const ROLES = ['MEMBER', 'VIP', 'MODERATOR', 'ADMIN'];

export default function AdminInvites() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', role: 'MEMBER', maxUses: '', expiresAt: '' });
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<InviteCode[]>('/forum/admin/invite-codes').then(setCodes).catch((e) => setMsg(e.message));
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api.post('/forum/admin/invite-codes', {
        code: form.code || undefined,
        role: form.role,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
      setForm({ code: '', role: 'MEMBER', maxUses: '', expiresAt: '' });
      setShowForm(false);
      setMsg('Tạo mã mời thành công!');
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Xóa mã mời này?')) return;
    try {
      await api.del(`/forum/admin/invite-codes/${id}`);
      setMsg('Đã xóa');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setMsg(`Đã sao chép: ${code}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý mã mời</h1>
        <button className="btn-primary flex items-center gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Tạo mã mời
        </button>
      </div>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {showForm && (
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Tạo mã mời mới</h2>
          <form onSubmit={create} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-ink-500">Mã mời (để trống để tự tạo)</label>
              <input className="input" placeholder="VD: VIP2024" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink-500">Vai trò</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink-500">Giới hạn lượt dùng (để trống = không giới hạn)</label>
              <input className="input" type="number" min="1" placeholder="VD: 100" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink-500">Hết hạn</label>
              <input className="input" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={busy}>{busy ? '...' : 'Tạo'}</button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
            <tr>
              <th className="p-3">Mã</th>
              <th className="p-3">Vai trò</th>
              <th className="p-3">Đã dùng / Giới hạn</th>
              <th className="p-3">Hết hạn</th>
              <th className="p-3">Người tạo</th>
              <th className="p-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-ink-100 dark:border-ink-800">
                <td className="p-3">
                  <code className="rounded bg-ink-100 px-2 py-0.5 font-mono text-sm dark:bg-ink-800">{c.code}</code>
                </td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    c.role === 'ADMIN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    c.role === 'MODERATOR' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    c.role === 'VIP' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400'
                  }`}>{c.role}</span>
                </td>
                <td className="p-3">{c.uses} / {c.maxUses ?? '∞'}</td>
                <td className="p-3">
                  {c.expiresAt
                    ? new Date(c.expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Không giới hạn'}
                </td>
                <td className="p-3 text-ink-500">{c.creator.displayName || c.creator.username}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => copyCode(c.code)} className="btn-outline !p-1.5" title="Sao chép mã">
                      <Copy size={14} />
                    </button>
                    <button onClick={() => remove(c.id)} className="btn-outline !p-1.5 text-red-600" title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-ink-500">Chưa có mã mời nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
