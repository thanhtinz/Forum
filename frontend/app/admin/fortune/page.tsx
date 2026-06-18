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
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  async function fetchModels() {
    if (!cfg) return;
    setLoadingModels(true);
    try { const r = await api.post<{ models: string[] }>('/ai-companion/models', { provider: cfg.aiProvider, apiKey: apiKey || undefined }); setModels(r.models || []); if (!r.models?.length) setMsg('Không lấy được model — lưu API key trước.'); }
    catch (e: any) { setMsg(e.message); } finally { setLoadingModels(false); }
  }

  async function saveKey() {
    if (!cfg) return;
    const k = cfg.aiProvider === 'OPENAI' ? 'ai.openaiKey' : cfg.aiProvider === 'GEMINI' ? 'ai.geminiKey' : 'ai.ollamaUrl';
    try { await api.patch(`/admin/config/setting/${k}`, { value: apiKey.trim() }); setMsg('Đã lưu API key ✓'); setApiKey(''); }
    catch (e: any) { setMsg(e.message); }
  }

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
            <input className="input mt-1" list="sys-ai-models" value={cfg.aiModel} onChange={(e) => set('aiModel', e.target.value)} />
            <datalist id="sys-ai-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
            <button type="button" onClick={fetchModels} disabled={loadingModels} className="mt-1 text-xs text-brand-600 hover:underline disabled:opacity-50">{loadingModels ? 'Đang tải…' : 'Tải model thực tế'}</button>
          </label>
        </div>
        <label className="mt-3 block text-sm">System prompt
          <textarea className="input mt-1 resize-y" rows={4} value={cfg.aiSystemPrompt} onChange={(e) => set('aiSystemPrompt', e.target.value)} />
        </label>

        {/* API key — lưu vào config server, dùng cho cả luận giải AI lẫn chat Minori */}
        <div className="mt-3 rounded-lg border border-ink-200/70 p-3 dark:border-ink-800">
          <label className="block text-sm font-medium">
            API key {cfg.aiProvider === 'OLLAMA' ? '(Ollama Base URL)' : `(${cfg.aiProvider})`}
            <div className="mt-1 flex gap-2">
              <input className="input flex-1" type="password" autoComplete="off"
                placeholder={cfg.aiProvider === 'OLLAMA' ? 'http://localhost:11434' : 'Dán API key…'}
                value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <button onClick={saveKey} disabled={!apiKey.trim()} className="btn-primary shrink-0 disabled:opacity-50">Lưu key</button>
            </div>
          </label>
          <p className="mt-1 text-xs text-ink-500">Key lưu an toàn ở server (đồng bộ Admin → Cài đặt → AI). Lưu xong dùng được ngay, không cần khởi động lại. Đổi Provider ở trên để lưu key tương ứng.</p>
        </div>
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
