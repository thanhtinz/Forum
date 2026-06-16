'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Award, BadgeCheck, Pencil } from 'lucide-react';
import { BadgeIcon } from '@/lib/icons';
import ImageUpload from '@/components/ImageUpload';

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

interface LevelTier {
  id: string;
  level: number;
  name: string;
  icon: string;
  color: string;
  minScore: number;
}

export default function AdminBadges() {
  const [catalog, setCatalog] = useState<Badge[]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', description: '', icon: '', color: 'amber', condType: '', condGte: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editTierId, setEditTierId] = useState<string | null>(null);

  // award / verify panel
  const [awardUserId, setAwardUserId] = useState('');
  const [awardBadgeId, setAwardBadgeId] = useState('');
  const [verifyUserId, setVerifyUserId] = useState('');

  // levels
  const [tiers, setTiers] = useState<LevelTier[]>([]);
  const [tierForm, setTierForm] = useState({ level: '', name: '', icon: '', color: 'green', minScore: '' });

  // icon ảnh cho badge hệ thống
  const [sysIcons, setSysIcons] = useState<Record<string, string>>({});

  function load() {
    api.get<Badge[]>('/badges/catalog').then(setCatalog).catch((e) => setMsg(e.message));
  }
  function loadTiers() {
    api.get<LevelTier[]>('/badges/levels').then(setTiers).catch((e) => setMsg(e.message));
  }
  function loadSysIcons() {
    api.get<Record<string, string>>('/badges/system-icons').then((r) => setSysIcons(r || {})).catch(() => {});
  }
  useEffect(() => { load(); loadTiers(); loadSysIcons(); }, []);

  async function saveSysIcon(key: string, url: string) {
    const next = { ...sysIcons, [key]: url };
    setSysIcons(next);
    try { await api.post('/badges/admin/system-icons', next); setMsg('Đã lưu icon hệ thống ✓'); } catch (e: any) { setMsg(e.message); }
  }

  function resetTierForm() { setTierForm({ level: '', name: '', icon: '', color: 'green', minScore: '' }); setEditTierId(null); }
  function startEditTier(t: LevelTier) {
    setEditTierId(t.id);
    setTierForm({ level: String(t.level), name: t.name, icon: t.icon, color: t.color, minScore: String(t.minScore) });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function createTier(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const payload = {
      level: Number(tierForm.level),
      name: tierForm.name,
      icon: tierForm.icon,
      color: tierForm.color,
      minScore: Number(tierForm.minScore),
    };
    try {
      if (editTierId) await api.patch(`/badges/admin/levels/${editTierId}`, payload);
      else await api.post('/badges/admin/levels', payload);
      resetTierForm();
      setMsg(editTierId ? 'Đã lưu cấp độ ✓' : 'Đã tạo cấp độ ✓');
      loadTiers();
    } catch (e: any) { setMsg(e.message); }
  }

  async function removeTier(id: string) {
    if (!confirm('Xoá cấp độ này?')) return;
    try { await api.del(`/badges/admin/levels/${id}`); if (editTierId === id) resetTierForm(); loadTiers(); } catch (e: any) { setMsg(e.message); }
  }

  function resetForm() { setForm({ name: '', description: '', icon: '', color: 'amber', condType: '', condGte: '' }); setEditId(null); }
  function startEdit(b: Badge) {
    setEditId(b.id);
    setForm({
      name: b.name, description: b.description || '', icon: b.icon, color: b.color,
      condType: b.condition?.type || '', condGte: b.condition?.gte != null ? String(b.condition.gte) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      const condition = form.condType && form.condGte ? { type: form.condType, gte: Number(form.condGte) } : null;
      const payload = { name: form.name, description: form.description || undefined, icon: form.icon, color: form.color, condition };
      if (editId) await api.patch(`/badges/admin/catalog/${editId}`, payload);
      else await api.post('/badges/admin/catalog', payload);
      resetForm();
      setMsg(editId ? 'Đã lưu huy hiệu ✓' : 'Đã tạo huy hiệu ✓');
      load();
    } catch (e: any) { setMsg(e.message); }
  }

  async function remove(id: string) {
    if (!confirm('Xoá huy hiệu này?')) return;
    try { await api.del(`/badges/admin/catalog/${id}`); if (editId === id) resetForm(); load(); } catch (e: any) { setMsg(e.message); }
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
          <h2 className="mb-2 flex items-center gap-1 font-semibold"><Plus size={16} /> {editId ? 'Sửa huy hiệu' : 'Tạo huy hiệu mục tiêu'}</h2>
          <form onSubmit={create} className="space-y-2">
            <input className="input" placeholder="Tên huy hiệu" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input" placeholder="Mô tả (tuỳ chọn)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
              {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ImageUpload value={form.icon} onUploaded={(url: string) => setForm({ ...form, icon: url })} label="Tải ảnh icon huy hiệu" />
            <div className="flex gap-2">
              <select className="input" value={form.condType} onChange={(e) => setForm({ ...form, condType: e.target.value })}>
                <option value="">— Tự trao theo cột mốc (tuỳ chọn) —</option>
                <option value="postCount">Số bài viết ≥</option>
                <option value="threadCount">Số chủ đề ≥</option>
                <option value="reputationScore">Điểm uy tín ≥</option>
              </select>
              <input className="input w-28" type="number" placeholder="Mốc" value={form.condGte} onChange={(e) => setForm({ ...form, condGte: e.target.value })} disabled={!form.condType} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary">{editId ? 'Lưu' : 'Tạo'}</button>
              {editId && <button type="button" onClick={resetForm} className="rounded-lg bg-ink-100 px-3 py-1.5 text-sm dark:bg-ink-800">Huỷ</button>}
            </div>
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
                {catalog.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                <td className="p-3"><span className="mr-1 inline-flex align-middle"><BadgeIcon icon={b.icon} size={18} /></span> {b.name} <span className="ml-1 text-xs text-ink-400">({b.color})</span></td>
                <td className="p-3 text-ink-500">{b.description || '—'}</td>
                <td className="p-3 text-xs text-ink-500">{b.condition ? `${b.condition.type} ≥ ${b.condition.gte}` : '—'}</td>
                <td className="p-3">{b.isAuto ? '✓' : '—'}</td>
                <td className="p-3"><div className="flex gap-2"><button onClick={() => startEdit(b)} className="text-brand-600" title="Sửa"><Pencil size={15} /></button><button onClick={() => remove(b.id)} className="text-red-600" title="Xoá"><Trash2 size={15} /></button></div></td>
              </tr>
            ))}
            {catalog.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-ink-500">Chưa có huy hiệu mục tiêu nào.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Icon badge hệ thống */}
      <h2 className="pt-2 text-lg font-bold">Icon badge hệ thống</h2>
      <p className="text-sm text-ink-500">Tải ảnh icon riêng cho các badge tự động (vai trò, tích xanh, người bán). Bỏ trống = dùng icon mặc định.</p>
      <div className="card grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {[
          { key: 'verify', label: 'Tích xanh' },
          { key: 'role:ADMIN', label: 'Quản trị viên' },
          { key: 'role:MODERATOR', label: 'Điều hành viên' },
          { key: 'role:VIP', label: 'VIP' },
          { key: 'role:MEMBER', label: 'Thành viên' },
          { key: 'seller', label: 'Người bán' },
          { key: 'seller_verified', label: 'Người bán uy tín' },
        ].map((s) => (
          <div key={s.key} className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium"><BadgeIcon icon={sysIcons[s.key]} size={18} /> {s.label}</div>
            <ImageUpload value={sysIcons[s.key]} onUploaded={(url: string) => saveSysIcon(s.key, url)} label="Tải icon" />
          </div>
        ))}
      </div>

      {/* Cấp độ (Level) */}
      <h2 className="pt-2 text-lg font-bold">Cấp độ (Level)</h2>
      <p className="text-sm text-ink-500">Điểm hoạt động = số bài viết + số chủ đề × 2 + điểm uy tín.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-2 flex items-center gap-1 font-semibold"><Plus size={16} /> {editTierId ? 'Sửa cấp độ' : 'Tạo cấp độ'}</h3>
          <form onSubmit={createTier} className="space-y-2">
            <div className="flex gap-2">
              <input className="input w-24" type="number" placeholder="Level" value={tierForm.level} onChange={(e) => setTierForm({ ...tierForm, level: e.target.value })} required />
              <input className="input" placeholder="Tên cấp độ" value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} required />
            </div>
            <div className="flex gap-2">
              <select className="input" value={tierForm.color} onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}>
                {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="input w-32" type="number" placeholder="Điểm tối thiểu" value={tierForm.minScore} onChange={(e) => setTierForm({ ...tierForm, minScore: e.target.value })} required />
            </div>
            <ImageUpload value={tierForm.icon} onUploaded={(url: string) => setTierForm({ ...tierForm, icon: url })} label="Tải ảnh icon cấp độ" />
            <div className="flex gap-2">
              <button className="btn-primary">{editTierId ? 'Lưu cấp độ' : 'Tạo cấp độ'}</button>
              {editTierId && <button type="button" onClick={resetTierForm} className="rounded-lg bg-ink-100 px-3 py-1.5 text-sm dark:bg-ink-800">Huỷ</button>}
            </div>
          </form>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-500"><tr><th className="p-3">Level</th><th className="p-3">Tên</th><th className="p-3">Icon</th><th className="p-3">Màu</th><th className="p-3">Điểm ≥</th><th className="p-3"></th></tr></thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className="border-t border-ink-100 dark:border-ink-800">
                  <td className="p-3">Lv.{t.level}</td>
                  <td className="p-3">{t.name}</td>
                  <td className="p-3"><BadgeIcon icon={t.icon} size={18} /></td>
                  <td className="p-3 text-xs text-ink-400">{t.color}</td>
                  <td className="p-3">{t.minScore}</td>
                  <td className="p-3"><div className="flex gap-2"><button onClick={() => startEditTier(t)} className="text-brand-600" title="Sửa"><Pencil size={15} /></button><button onClick={() => removeTier(t.id)} className="text-red-600" title="Xoá"><Trash2 size={15} /></button></div></td>
                </tr>
              ))}
              {tiers.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink-500">Chưa có cấp độ nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
