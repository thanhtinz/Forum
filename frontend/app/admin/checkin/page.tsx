'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Save, CalendarCheck } from 'lucide-react';

interface CheckInConfig {
  base: number;
  streakBonus: number;
  maxBonus: number;
  weeklyBonus: number;
}

const FIELDS: { key: keyof CheckInConfig; label: string; hint: string }[] = [
  { key: 'base', label: 'Thưởng cơ bản', hint: 'Số coin nhận khi điểm danh ngày đầu' },
  { key: 'streakBonus', label: 'Thưởng mỗi ngày chuỗi', hint: 'Cộng thêm cho mỗi ngày liên tiếp' },
  { key: 'maxBonus', label: 'Thưởng tối đa (giới hạn cộng dồn)', hint: 'Mức cộng dồn tối đa so với thưởng cơ bản' },
  { key: 'weeklyBonus', label: 'Thưởng mỗi 7 ngày', hint: 'Thưởng thêm khi chuỗi đạt bội số của 7' },
];

export default function AdminCheckIn() {
  const [form, setForm] = useState<CheckInConfig>({ base: 50, streakBonus: 10, maxBonus: 200, weeklyBonus: 100 });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    api
      .get<CheckInConfig>('/checkin/admin/config')
      .then(setForm)
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const saved = await api.post<CheckInConfig>('/checkin/admin/config', form);
      setForm(saved);
      setMsg('Đã lưu cấu hình điểm danh!');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-ink-500">Đang tải...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="text-brand-600" />
        <h1 className="text-xl font-bold">Cấu hình điểm danh</h1>
      </div>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      <div className="card p-4">
        <form onSubmit={save} className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm text-ink-500">{f.label}</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}
              />
              <p className="mt-1 text-xs text-ink-400">{f.hint}</p>
            </div>
          ))}
          <button className="btn-primary flex items-center gap-1" disabled={busy}>
            <Save size={16} /> {busy ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </form>
      </div>
    </div>
  );
}
