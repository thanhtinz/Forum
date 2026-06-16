'use client';

import { useEffect, useState } from 'react';
import { Utensils, Droplet, Sparkles, BatteryCharging, HeartPulse, Bed, ShowerHead } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const BARS: [string, string, any, string][] = [
  ['hunger', 'Đói', Utensils, 'bg-orange-500'],
  ['thirst', 'Khát', Droplet, 'bg-sky-500'],
  ['hygiene', 'Vệ sinh', Sparkles, 'bg-emerald-500'],
  ['energy', 'Năng lượng', BatteryCharging, 'bg-amber-500'],
  ['health', 'Sức khỏe', HeartPulse, 'bg-rose-500'],
];

export default function SurvivalPage() {
  const { user, loading } = useAuth();
  const [s, setS] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  function load() { api.get('/game/survival').then(setS).catch((e) => setMsg(e.message)); }
  useEffect(() => { if (!loading && user) { load(); api.get<any[]>('/game/consumables').then(setItems).catch(() => {}); } }, [user, loading]);

  const act = async (fn: () => Promise<any>) => { try { await fn(); setMsg('OK'); } catch (e: any) { setMsg(e.message); } load(); };
  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để xem nhu cầu nhân vật.</div>;
  if (!s) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white shadow-card">
        <h1 className="text-2xl font-bold">Nhu cầu sinh tồn</h1>
        <p className="text-white/90">{s.isSick ? `🤒 Đang bệnh: ${s.sickness || ''}` : 'Tình trạng: ' + (s.status || 'bình thường')}</p>
      </header>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      <div className="card space-y-3 p-5">
        {BARS.map(([k, label, Icon, color]) => (
          <div key={k}>
            <div className="mb-1 flex items-center justify-between text-sm"><span className="flex items-center gap-1"><Icon size={14} /> {label}</span><span>{Math.round(s[k] ?? 0)}/100</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"><div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, s[k] ?? 0))}%` }} /></div>
          </div>
        ))}
        {s.warnings?.length > 0 && <p className="text-sm text-amber-600">⚠️ {s.warnings.join(' · ')}</p>}
      </div>

      <div className="flex gap-2">
        <button onClick={() => act(() => api.post('/game/survival/sleep', { hours: 8 }))} className="btn-outline"><Bed size={16} /> Ngủ 8h</button>
        <button onClick={() => act(() => api.post('/game/survival/clean'))} className="btn-outline"><ShowerHead size={16} /> Vệ sinh</button>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Vật phẩm (ăn/uống/thuốc)</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <button key={it.id} onClick={() => act(() => api.post('/game/survival/consume', { consumableId: it.id }))} className="card p-3 text-left text-sm hover:shadow-lg">
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-ink-500">
                {[it.restoreHunger && `+${it.restoreHunger} đói`, it.restoreThirst && `+${it.restoreThirst} khát`, it.restoreHealth && `+${it.restoreHealth} máu`, it.restoreEnergy && `+${it.restoreEnergy} NL`, it.restoreHygiene && `+${it.restoreHygiene} VS`].filter(Boolean).join(', ')}
              </div>
            </button>
          ))}
          {items.length === 0 && <p className="col-span-full text-ink-500">Chưa có vật phẩm.</p>}
        </div>
      </section>
    </div>
  );
}
