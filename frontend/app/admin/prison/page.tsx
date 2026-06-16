'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Inmate { id: string; username: string; displayName?: string; reason: string; releaseAt: string; bailCoin: number; }

export default function AdminPrison() {
  const [inmates, setInmates] = useState<Inmate[]>([]);
  const [form, setForm] = useState({ username: '', minutes: 60, reason: '', bailCoin: 0 });
  const [msg, setMsg] = useState('');

  function load() { api.get<{ data: Inmate[] }>('/prison/inmates').then((r) => setInmates(r.data)).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);

  const jail = async () => {
    try { await api.post('/prison/jail', form); setMsg('Đã giam'); setForm({ ...form, username: '', reason: '' }); } catch (e: any) { setMsg(e.message); }
    load();
  };
  const pardon = async (id: string) => { try { await api.post(`/prison/pardon/${id}`); setMsg('Đã ân xá'); } catch (e: any) { setMsg(e.message); } load(); };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nhà tù (Giám thị)</h1>

      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Tống giam</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="input" type="number" placeholder="Phút" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Tiền chuộc (coin)" value={form.bailCoin} onChange={(e) => setForm({ ...form, bailCoin: Number(e.target.value) })} />
          <button onClick={jail} className="btn-primary">Giam</button>
        </div>
        <input className="input mt-2" placeholder="Lý do" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        {msg && <p className="mt-2 text-sm text-brand-600">{msg}</p>}
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Tù nhân đang giam ({inmates.length})</h2>
        <div className="space-y-2">
          {inmates.map((i) => (
            <div key={i.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm dark:border-ink-800">
              <div>
                <b>{i.displayName || i.username}</b> — {i.reason}
                <div className="text-xs text-ink-400">Ra tù: {new Date(i.releaseAt).toLocaleString('vi')} · chuộc {i.bailCoin} coin</div>
              </div>
              <button onClick={() => pardon(i.id)} className="btn-outline !py-1 text-xs">Ân xá</button>
            </div>
          ))}
          {inmates.length === 0 && <p className="text-ink-500">Không có tù nhân.</p>}
        </div>
      </section>
    </div>
  );
}
