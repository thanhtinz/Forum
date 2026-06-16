'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Cfg {
  priceBazi: number; priceTarot: number; priceMeihua: number;
  aiEnabled: boolean; aiPrice: number;
  aiProvider: 'OPENAI' | 'GEMINI' | 'OLLAMA'; aiModel: string; aiSystemPrompt: string;
}

export default function AdminFortune() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<Cfg>('/fortune/admin/config').then(setCfg).catch((e) => setMsg(e.message));
    api.get('/fortune/admin/stats').then(setStats).catch(() => {});
  }, []);

  if (!cfg) return <div className="p-10 text-center text-ink-500">{msg || 'Đang tải…'}</div>;
  const set = (k: keyof Cfg, v: any) => setCfg({ ...cfg, [k]: v });

  async function save() {
    setMsg('');
    try { const r = await api.put<Cfg>('/fortune/admin/config', cfg); setCfg(r); setMsg('Đã lưu ✓'); }
    catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Quản lý Bói toán & AI</h1>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Giá xem (coin/lần) — 0 = miễn phí</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Num label="Bát Tự" value={cfg.priceBazi} onChange={(v) => set('priceBazi', v)} />
          <Num label="Tarot" value={cfg.priceTarot} onChange={(v) => set('priceTarot', v)} />
          <Num label="Mai Hoa" value={cfg.priceMeihua} onChange={(v) => set('priceMeihua', v)} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Luận giải AI</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={cfg.aiEnabled} onChange={(e) => set('aiEnabled', e.target.checked)} />
          <span>Bật luận giải AI</span>
        </label>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Num label="Phí AI (coin/lần)" value={cfg.aiPrice} onChange={(v) => set('aiPrice', v)} />
          <label className="text-sm">Provider
            <select className="input mt-1" value={cfg.aiProvider} onChange={(e) => set('aiProvider', e.target.value)}>
              <option value="GEMINI">Gemini</option><option value="OPENAI">OpenAI</option><option value="OLLAMA">Ollama</option>
            </select>
          </label>
          <label className="text-sm">Model
            <input className="input mt-1" value={cfg.aiModel} onChange={(e) => set('aiModel', e.target.value)} />
          </label>
        </div>
        <label className="mt-3 block text-sm">System prompt
          <textarea className="input mt-1 resize-y" rows={4} value={cfg.aiSystemPrompt} onChange={(e) => set('aiSystemPrompt', e.target.value)} />
        </label>
        <p className="mt-2 text-xs text-ink-500">API key đặt ở biến môi trường server (OPENAI_API_KEY / GEMINI_API_KEY / OLLAMA_BASE_URL).</p>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} className="btn-primary">Lưu cấu hình</button>
        {msg && <span className="text-sm text-brand-600">{msg}</span>}
      </div>

      {stats && (
        <section className="card p-5">
          <h2 className="mb-2 font-semibold">Thống kê lượt xem</h2>
          <p className="text-sm">Tổng: <b>{stats.total}</b></p>
          <ul className="mt-1 text-sm text-ink-600 dark:text-ink-300">
            {stats.byType?.map((b: any) => <li key={b.type}>{b.type}: {b.count}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-sm">{label}
      <input type="number" className="input mt-1" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
