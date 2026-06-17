'use client';

import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Check } from 'lucide-react';

interface Group { id: string; key: string; name: string; color?: string; priority: number; isSystem: boolean; permissions: string[]; autoPromote?: boolean; minPosts?: number; minReputation?: number; minDays?: number; _count?: { members: number } }
interface CatItem { key: string; label: string; group: string }
const COLORS = ['red', 'blue', 'amber', 'green', 'gray', 'violet'];

export default function AdminGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [catalog, setCatalog] = useState<CatItem[]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', color: 'gray', priority: 30, autoPromote: false, minPosts: 0, minReputation: 0, minDays: 0 });
  const [assign, setAssign] = useState({ userId: '', groupId: '' });

  async function savePromo(g: Group, patch: Partial<Group>) {
    setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, ...patch } : x)));
    try { await api.patch(`/permissions/groups/${g.id}`, patch); } catch (e: any) { setMsg(e.message); }
  }

  function load() {
    api.get<Group[]>('/permissions/groups').then(setGroups).catch((e) => setMsg(e.message));
    api.get<{ catalog: CatItem[] }>('/permissions/catalog').then((r) => setCatalog(r.catalog)).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  const hasAll = (g: Group) => g.permissions.includes('*');
  const checked = (g: Group, key: string) => hasAll(g) || g.permissions.includes(key);

  async function toggle(g: Group, key: string) {
    if (hasAll(g)) return; // nhóm admin: tất cả, không sửa
    const next = checked(g, key) ? g.permissions.filter((p) => p !== key) : [...g.permissions, key];
    setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, permissions: next } : x)));
    try { await api.patch(`/permissions/groups/${g.id}`, { permissions: next }); } catch (e: any) { setMsg(e.message); load(); }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    try { await api.post('/permissions/groups', form); setForm({ name: '', color: 'gray', priority: 30, autoPromote: false, minPosts: 0, minReputation: 0, minDays: 0 }); load(); }
    catch (e: any) { setMsg(e.message); }
  }
  async function removeGroup(id: string) {
    if (!confirm('Xoá nhóm này?')) return;
    try { await api.del(`/permissions/groups/${id}`); load(); } catch (e: any) { setMsg(e.message); }
  }
  async function doAssign() {
    if (!assign.userId || !assign.groupId) return;
    try { await api.post('/permissions/assign', assign); setMsg('Đã gán user vào nhóm ✓'); setAssign({ userId: '', groupId: '' }); load(); }
    catch (e: any) { setMsg(e.message); }
  }

  // gom permission theo nhóm hiển thị
  const cats = [...new Set(catalog.map((c) => c.group))];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nhóm & Phân quyền</h1>
      <p className="text-sm text-ink-500">Lưới phân quyền kiểu Flarum: tick để cấp quyền cho từng nhóm. Nhóm hệ thống map theo vai trò; có thể tạo nhóm phụ và gán thành viên. Quản trị viên luôn có mọi quyền.</p>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200/70 text-left dark:border-ink-800">
              <th className="p-3">Quyền</th>
              {groups.map((g) => (
                <th key={g.id} className="p-3 text-center">
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-[10px] font-normal text-ink-400">{g._count?.members ?? 0} TV{!g.isSystem && ' · phụ'}</div>
                  {!g.isSystem && <button onClick={() => removeGroup(g.id)} className="mt-0.5 text-red-500" title="Xoá nhóm"><Trash2 size={12} /></button>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cats.map((cat) => (
              <Fragment key={cat}>
                <tr className="bg-ink-50 dark:bg-ink-900/50"><td className="px-3 py-1.5 text-xs font-semibold uppercase text-ink-500" colSpan={groups.length + 1}>{cat}</td></tr>
                {catalog.filter((c) => c.group === cat).map((c) => (
                  <tr key={c.key} className="border-b border-ink-100 dark:border-ink-800">
                    <td className="p-2.5">{c.label} <code className="ml-1 text-[10px] text-ink-400">{c.key}</code></td>
                    {groups.map((g) => (
                      <td key={g.id} className="p-2.5 text-center">
                        <button onClick={() => toggle(g, c.key)} disabled={hasAll(g)}
                          className={`mx-auto flex h-5 w-5 items-center justify-center rounded border ${checked(g, c.key) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink-300 dark:border-ink-600'} ${hasAll(g) ? 'opacity-60' : ''}`}>
                          {checked(g, c.key) && <Check size={13} />}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tự thăng nhóm theo cột mốc */}
      <div className="card p-4">
        <h2 className="mb-2 font-semibold">Tự thăng nhóm (cột mốc)</h2>
        <p className="mb-2 text-xs text-ink-500">Khi user đăng nhập và đạt đủ điều kiện, sẽ được tự gán vào nhóm phụ tương ứng.</p>
        <div className="space-y-1.5">
          {groups.filter((g) => !g.isSystem).map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-2 border-b border-ink-100 py-1.5 text-sm dark:border-ink-800">
              <span className="w-32 font-medium">{g.name}</span>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!g.autoPromote} onChange={(e) => savePromo(g, { autoPromote: e.target.checked })} /> Bật</label>
              <label className="text-xs">Bài ≥ <input type="number" className="input ml-1 w-20" value={g.minPosts ?? 0} onChange={(e) => savePromo(g, { minPosts: Number(e.target.value) })} /></label>
              <label className="text-xs">Uy tín ≥ <input type="number" className="input ml-1 w-20" value={g.minReputation ?? 0} onChange={(e) => savePromo(g, { minReputation: Number(e.target.value) })} /></label>
              <label className="text-xs">Ngày ≥ <input type="number" className="input ml-1 w-16" value={g.minDays ?? 0} onChange={(e) => savePromo(g, { minDays: Number(e.target.value) })} /></label>
            </div>
          ))}
          {groups.filter((g) => !g.isSystem).length === 0 && <p className="text-xs text-ink-400">Tạo nhóm phụ ở dưới để cấu hình tự thăng nhóm.</p>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={createGroup} className="card space-y-2 p-4">
          <h2 className="flex items-center gap-1 font-semibold"><Plus size={16} /> Tạo nhóm phụ</h2>
          <input className="input" placeholder="Tên nhóm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="flex gap-2">
            <select className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>{COLORS.map((c) => <option key={c}>{c}</option>)}</select>
            <input className="input w-28" type="number" placeholder="Ưu tiên" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.autoPromote} onChange={(e) => setForm({ ...form, autoPromote: e.target.checked })} /> Tự thăng nhóm khi đạt cột mốc</label>
          {form.autoPromote && (
            <div className="flex flex-wrap gap-2 text-xs">
              <label>Bài ≥ <input type="number" className="input ml-1 w-20" value={form.minPosts} onChange={(e) => setForm({ ...form, minPosts: Number(e.target.value) })} /></label>
              <label>Uy tín ≥ <input type="number" className="input ml-1 w-20" value={form.minReputation} onChange={(e) => setForm({ ...form, minReputation: Number(e.target.value) })} /></label>
              <label>Ngày tuổi ≥ <input type="number" className="input ml-1 w-16" value={form.minDays} onChange={(e) => setForm({ ...form, minDays: Number(e.target.value) })} /></label>
            </div>
          )}
          <button className="btn-primary">Tạo nhóm</button>
        </form>

        <div className="card space-y-2 p-4">
          <h2 className="font-semibold">Gán thành viên vào nhóm phụ</h2>
          <input className="input" placeholder="User ID" value={assign.userId} onChange={(e) => setAssign({ ...assign, userId: e.target.value })} />
          <select className="input" value={assign.groupId} onChange={(e) => setAssign({ ...assign, groupId: e.target.value })}>
            <option value="">— Chọn nhóm —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={doAssign} className="btn-outline">Gán</button>
        </div>
      </div>
    </div>
  );
}
