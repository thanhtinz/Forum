'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Pencil, Sparkles, Coins, CircleDot } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

interface Segment {
  id: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  rewardType: string;
  rewardAmount: number;
  rewardRefId?: string | null;
  weight: number;
  sortOrder: number;
}

interface Wheel {
  id: string;
  name: string;
  costCoin: number;
  isActive: boolean;
  segments: Segment[];
}

const REWARD_TYPES = [
  { value: 'coin', label: 'Coin' },
  { value: 'item', label: 'Vật phẩm (templateId)' },
  { value: 'badge', label: 'Huy hiệu (badgeId)' },
  { value: 'nothing', label: 'Không trúng' },
];

const emptySeg = {
  label: '',
  color: '#fbbf24',
  rewardType: 'coin',
  rewardAmount: '',
  rewardRefId: '',
  weight: '1',
  sortOrder: '0',
  icon: '',
};

export default function AdminSpin() {
  const [wheels, setWheels] = useState<Wheel[]>([]);
  const [msg, setMsg] = useState('');

  // wheel form
  const [wheelForm, setWheelForm] = useState({ name: '', costCoin: '100', isActive: true });
  const [editWheelId, setEditWheelId] = useState<string | null>(null);

  // segment form (per selected wheel)
  const [segWheelId, setSegWheelId] = useState<string | null>(null);
  const [segForm, setSegForm] = useState<any>(emptySeg);
  const [editSegId, setEditSegId] = useState<string | null>(null);

  function load() {
    api.get<Wheel[]>('/spin/admin/wheels').then(setWheels).catch((e) => setMsg(e.message));
  }
  useEffect(() => {
    load();
  }, []);

  function resetWheelForm() {
    setWheelForm({ name: '', costCoin: '100', isActive: true });
    setEditWheelId(null);
  }
  function startEditWheel(w: Wheel) {
    setEditWheelId(w.id);
    setWheelForm({ name: w.name, costCoin: String(w.costCoin), isActive: w.isActive });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveWheel(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const payload = {
      name: wheelForm.name,
      costCoin: Number(wheelForm.costCoin),
      isActive: wheelForm.isActive,
    };
    try {
      if (editWheelId) await api.patch(`/spin/admin/wheels/${editWheelId}`, payload);
      else await api.post('/spin/admin/wheels', payload);
      resetWheelForm();
      setMsg(editWheelId ? 'Đã lưu vòng quay ✓' : 'Đã tạo vòng quay ✓');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function removeWheel(id: string) {
    if (!confirm('Xoá vòng quay này? (các ô phần thưởng cũng bị xoá)')) return;
    try {
      await api.del(`/spin/admin/wheels/${id}`);
      if (editWheelId === id) resetWheelForm();
      if (segWheelId === id) setSegWheelId(null);
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  function openSegForm(wheelId: string) {
    setSegWheelId(wheelId);
    setEditSegId(null);
    setSegForm(emptySeg);
  }
  function startEditSeg(s: Segment) {
    setSegWheelId(null);
    setEditSegId(s.id);
    setSegForm({
      label: s.label,
      color: s.color || '#fbbf24',
      rewardType: s.rewardType,
      rewardAmount: String(s.rewardAmount),
      rewardRefId: s.rewardRefId || '',
      weight: String(s.weight),
      sortOrder: String(s.sortOrder),
      icon: s.icon || '',
    });
  }

  async function saveSeg(e: React.FormEvent, wheelId?: string) {
    e.preventDefault();
    setMsg('');
    const payload = {
      label: segForm.label,
      color: segForm.color || undefined,
      rewardType: segForm.rewardType,
      rewardAmount: Number(segForm.rewardAmount) || 0,
      rewardRefId: segForm.rewardRefId || undefined,
      weight: Number(segForm.weight) || 1,
      sortOrder: Number(segForm.sortOrder) || 0,
      icon: segForm.icon || undefined,
    };
    try {
      if (editSegId) {
        await api.patch(`/spin/admin/segments/${editSegId}`, payload);
      } else if (wheelId) {
        await api.post(`/spin/admin/wheels/${wheelId}/segments`, payload);
      }
      setEditSegId(null);
      setSegWheelId(null);
      setSegForm(emptySeg);
      setMsg('Đã lưu ô phần thưởng ✓');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function removeSeg(id: string) {
    if (!confirm('Xoá ô phần thưởng này?')) return;
    try {
      await api.del(`/spin/admin/segments/${id}`);
      if (editSegId === id) {
        setEditSegId(null);
        setSegForm(emptySeg);
      }
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  function SegForm({ wheelId }: { wheelId?: string }) {
    return (
      <form onSubmit={(e) => saveSeg(e, wheelId)} className="space-y-2 rounded-xl border border-ink-200 p-3 dark:border-ink-700">
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1" placeholder="Nhãn ô" value={segForm.label} onChange={(e) => setSegForm({ ...segForm, label: e.target.value })} required />
          <input className="input w-24" type="color" value={segForm.color} onChange={(e) => setSegForm({ ...segForm, color: e.target.value })} title="Màu" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input flex-1" value={segForm.rewardType} onChange={(e) => setSegForm({ ...segForm, rewardType: e.target.value })}>
            {REWARD_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <input className="input w-28" type="number" placeholder="Số lượng" value={segForm.rewardAmount} onChange={(e) => setSegForm({ ...segForm, rewardAmount: e.target.value })} />
        </div>
        {(segForm.rewardType === 'item' || segForm.rewardType === 'badge') && (
          <input className="input" placeholder={segForm.rewardType === 'item' ? 'itemTemplateId' : 'badgeId'} value={segForm.rewardRefId} onChange={(e) => setSegForm({ ...segForm, rewardRefId: e.target.value })} />
        )}
        <div className="flex flex-wrap gap-2">
          <input className="input w-28" type="number" placeholder="Trọng số" value={segForm.weight} onChange={(e) => setSegForm({ ...segForm, weight: e.target.value })} title="Trọng số (xác suất)" />
          <input className="input w-28" type="number" placeholder="Thứ tự" value={segForm.sortOrder} onChange={(e) => setSegForm({ ...segForm, sortOrder: e.target.value })} title="Thứ tự sắp xếp" />
        </div>
        <ImageUpload value={segForm.icon} onUploaded={(url: string) => setSegForm({ ...segForm, icon: url })} label="Tải ảnh icon ô (tuỳ chọn)" />
        <div className="flex gap-2">
          <button className="btn-primary !py-1.5 text-sm">{editSegId ? 'Lưu ô' : 'Thêm ô'}</button>
          <button type="button" onClick={() => { setEditSegId(null); setSegWheelId(null); setSegForm(emptySeg); }} className="rounded-lg bg-ink-100 px-3 py-1.5 text-sm dark:bg-ink-800">Huỷ</button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Sparkles size={20} className="text-amber-500" /> Vòng quay may mắn
      </h1>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* Tạo / sửa vòng quay */}
      <div className="card p-4">
        <h2 className="mb-2 flex items-center gap-1 font-semibold">
          <Plus size={16} /> {editWheelId ? 'Sửa vòng quay' : 'Tạo vòng quay'}
        </h2>
        <form onSubmit={saveWheel} className="flex flex-wrap items-center gap-2">
          <input className="input flex-1" placeholder="Tên vòng quay" value={wheelForm.name} onChange={(e) => setWheelForm({ ...wheelForm, name: e.target.value })} required />
          <input className="input w-36" type="number" placeholder="Chi phí coin" value={wheelForm.costCoin} onChange={(e) => setWheelForm({ ...wheelForm, costCoin: e.target.value })} required />
          <label className="inline-flex items-center gap-1 text-sm">
            <input type="checkbox" checked={wheelForm.isActive} onChange={(e) => setWheelForm({ ...wheelForm, isActive: e.target.checked })} /> Đang mở
          </label>
          <button className="btn-primary">{editWheelId ? 'Lưu' : 'Tạo'}</button>
          {editWheelId && <button type="button" onClick={resetWheelForm} className="rounded-lg bg-ink-100 px-3 py-1.5 text-sm dark:bg-ink-800">Huỷ</button>}
        </form>
      </div>

      {/* Danh sách vòng quay + ô phần thưởng */}
      {wheels.map((w) => (
        <div key={w.id} className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              {w.name}
              <span className="inline-flex items-center gap-1 text-xs font-normal text-ink-500">
                <Coins size={13} className="text-amber-500" /> {w.costCoin}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${w.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
                {w.isActive ? 'Đang mở' : 'Đã tắt'}
              </span>
            </h2>
            <div className="flex gap-2">
              <button onClick={() => startEditWheel(w)} className="text-brand-600" title="Sửa"><Pencil size={15} /></button>
              <button onClick={() => removeWheel(w.id)} className="text-red-600" title="Xoá"><Trash2 size={15} /></button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-500">
                <tr>
                  <th className="p-2">Ô</th>
                  <th className="p-2">Loại</th>
                  <th className="p-2">Số lượng</th>
                  <th className="p-2">Trọng số</th>
                  <th className="p-2">Thứ tự</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {w.segments.map((s) => (
                  <tr key={s.id} className="border-t border-ink-100 dark:border-ink-800">
                    <td className="p-2">
                      <span className="inline-flex items-center gap-2">
                        {s.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.icon} alt="" className="h-5 w-5 rounded object-cover" />
                        ) : (
                          <CircleDot size={16} style={s.color ? { color: s.color } : undefined} />
                        )}
                        {s.label}
                      </span>
                    </td>
                    <td className="p-2">{REWARD_TYPES.find((r) => r.value === s.rewardType)?.label ?? s.rewardType}</td>
                    <td className="p-2">{s.rewardAmount}</td>
                    <td className="p-2">{s.weight}</td>
                    <td className="p-2">{s.sortOrder}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button onClick={() => startEditSeg(s)} className="text-brand-600" title="Sửa"><Pencil size={14} /></button>
                        <button onClick={() => removeSeg(s.id)} className="text-red-600" title="Xoá"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {w.segments.length === 0 && (
                  <tr><td colSpan={6} className="p-3 text-center text-ink-500">Chưa có ô phần thưởng.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* form sửa segment thuộc wheel này */}
          {editSegId && w.segments.some((s) => s.id === editSegId) && (
            <div className="mt-3"><SegForm /></div>
          )}

          {/* form thêm segment */}
          {segWheelId === w.id ? (
            <div className="mt-3"><SegForm wheelId={w.id} /></div>
          ) : (
            <button onClick={() => openSegForm(w.id)} className="btn-outline mt-3 inline-flex items-center gap-1 !py-1.5 text-sm">
              <Plus size={15} /> Thêm ô phần thưởng
            </button>
          )}
        </div>
      ))}

      {wheels.length === 0 && (
        <div className="card p-6 text-center text-ink-500">Chưa có vòng quay nào.</div>
      )}
    </div>
  );
}
