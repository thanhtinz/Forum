'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Award, BadgeCheck } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  condition?: any;
  isAuto: boolean;
}

const COLORS = ['red', 'blue', 'amber', 'green', 'gray', 'violet'];

export default function AdminBadges() {
  const [catalog, setCatalog] = useState<Badge[]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', description: '', icon: '🏅', color: 'amber', condType: '', condGte: '' });

  // award / verify panel
  const [awardUserId, setAwardUserId] = useState('');
  const [awardBadgeId, setAwardBadgeId] = useState('');
  const [verifyUserId, setVerifyUserId] = useState('');

  function load() {
    api.get<Badge[]>('/badges/catalog').then(setCatalog).catch((e) => setMsg(e.message));
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      const condition = form.condType && form.condGte ? { type: form.condType, gte: Number(form.condGte) } : undefined;
      await api.post('/badges/admin/catalog', {
        name: form.name, description: form.description || undefined, icon: form.icon, color: form.color, condition,
      });
      setForm({ name: '', description: '', icon: '🏅', color: 'amber', condType: '', condGte: '' });
      setMsg('Đã tạo huy hiệu ✓');
      load();
    } catch (e: any) { setMsg(e.message); }
  }

  async function remove(id: string) {
    if (!confirm('Xoá huy hiệu này?')) return;
    try { await api.del(`/badges/admin/catalog/${id}`); load(); } catch (e: any) { setMsg(e.message); }
  }

  async function award() {
    if (!awardUserId || !awardBadgeId) return;
    try { await api.post('/badges/admin/award', { userId: awardUserId, badgeId: awardBadgeId }); setMsg('Đã trao huy hiệu ✓'); }
    catch (e: any) { setMsg(e.message); }
  }

  async function setVerify(value: boolean) {
    if (!verifyUserId) return;
    try { await api.post('/badges/admin/verify', { userId: verifyUserId, value }); setMsg(value ? 'Đã cấp tích xanh ✓' : 'Đã gỡ tích xanh ✓'); }
    catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Huy hiệu (Badge)</h1>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tạo badge mục tiêu */}
        <div className="card p-4">
          <h2 className="mb-2 flex items-center gap-1 font-semibold"><Plus size={16} /> Tạo huy hiệu mục tiêu</h2>
          <form onSubmit={create} className="space-y-2">
            <input className="input" placeholder="Tên huy hiệu" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input" placeholder="Mô tả (tuỳ chọn)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="flex gap-2">
              <input className="input w-20 text-center" placeholder="Icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              <select className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <select className="input" value={form.condType} onChange={(e) => setForm({ ...form, condType: e.target.value })}>
                <option value="">— Tự trao theo cột mốc (tuỳ chọn) —</option>
                <option value="postCount">Số bài viết ≥</option>
                <option value="threadCount">Số chủ đề ≥</option>
                <option value="reputationScore">Điểm uy tín ≥</option>
              </select>
              <input className="input w-28" type="number" placeholder="Mốc" value={form.condGte} onChange={(e) => setForm({ ...form, condGte: e.target.value })} disabled={!form.condType} />
            </div>
            <button className="btn-primary">Tạo</button>
          </form>
        </div>

        {/* Trao thủ công + verify */}
        <div className="card space-y-4 p-4">
          <div>
            <h2 className="mb-2 flex items-center gap-1 font-semibold"><Award size={16} /> Trao huy hiệu thủ công</h2>
            <div className="space-y-2">
              <input className="input" placeholder="User ID" value={awardUserId} onChange={(e) => setAwardUserId(e.target.value)} />
              <select className="input" value={awardBadgeId} onChange={(e) => setAwardBadgeId(e.target.value)}>
                <option value="">— Chọn huy hiệu —</option>
                {catalog.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
              </select>
              <button onClick={award} className="btn-outline">Trao</button>
            </div>
          </div>
          <div className="border-t border-ink-200/70 pt-3 dark:border-ink-800">
            <h2 className="mb-2 flex items-center gap-1 font-semibold"><BadgeCheck size={16} /> Tích xanh (Verify)</h2>
            <div className="flex flex-wrap gap-2">
              <input className="input flex-1" placeholder="User ID" value={verifyUserId} onChange={(e) => setVerifyUserId(e.target.value)} />
              <button onClick={() => setVerify(true)} className="btn-primary !py-1.5 text-sm">Cấp</button>
              <button onClick={() => setVerify(false)} className="rounded-lg bg-ink-100 px-3 py-1.5 text-sm dark:bg-ink-800">Gỡ</button>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách catalog */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-500"><tr><th className="p-3">Huy hiệu</th><th className="p-3">Mô tả</th><th className="p-3">Điều kiện</th><th className="p-3">Tự trao</th><th className="p-3"></th></tr></thead>
          <tbody>
            {catalog.map((b) => (
              <tr key={b.id} className="border-t border-ink-100 dark:border-ink-800">
                <td className="p-3"><span className="mr-1">{b.icon}</span> {b.name} <span className="ml-1 text-xs text-ink-400">({b.color})</span></td>
                <td className="p-3 text-ink-500">{b.description || '—'}</td>
                <td className="p-3 text-xs text-ink-500">{b.condition ? `${b.condition.type} ≥ ${b.condition.gte}` : '—'}</td>
                <td className="p-3">{b.isAuto ? '✓' : '—'}</td>
                <td className="p-3"><button onClick={() => remove(b.id)} className="text-red-600" title="Xoá"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {catalog.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-ink-500">Chưa có huy hiệu mục tiêu nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
