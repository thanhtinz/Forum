'use client';

import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

// Nhiều nguồn AI — gồm cả nguồn OpenAI-compatible (OpenRouter, Groq, LM Studio, proxy không kiểm duyệt…)
const PROVIDERS: { value: string; label: string; needBase?: boolean; defaultBase?: string; hint?: string }[] = [
  { value: 'GEMINI', label: 'Google Gemini' },
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'OPENAI_COMPAT', label: 'OpenAI-compatible (tự nhập URL)', needBase: true, defaultBase: '', hint: 'OpenRouter, Groq, Together, DeepSeek, LM Studio, proxy riêng…' },
  { value: 'OLLAMA', label: 'Ollama (tự host)', needBase: true, defaultBase: 'http://localhost:11434' },
];
// Một vài base URL gợi ý cho nguồn OpenAI-compatible
const PRESETS: { label: string; url: string }[] = [
  { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { label: 'Groq', url: 'https://api.groq.com/openai/v1' },
  { label: 'Together', url: 'https://api.together.xyz/v1' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
];

export default function UserAiSettings() {
  const { user, loading } = useAuth();
  const [provider, setProvider] = useState('GEMINI');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [msg, setMsg] = useState('');

  const pInfo = PROVIDERS.find((p) => p.value === provider);

  useEffect(() => {
    if (!user) return;
    api.get<{ provider: string; model: string; baseUrl: string; hasKey: boolean }>('/users/me/ai').then((r) => {
      if (r.provider) setProvider(r.provider);
      setModel(r.model || ''); setBaseUrl(r.baseUrl || ''); setHasKey(r.hasKey);
    }).catch(() => {});
  }, [user]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để cấu hình AI.</div>;

  // Lấy model realtime theo provider (+ key/baseUrl đang nhập)
  async function fetchModels() {
    setLoadingModels(true); setMsg('');
    try {
      const r = await api.post<{ models: string[] }>('/ai-companion/models', { provider, apiKey: apiKey || undefined, baseUrl: baseUrl || undefined });
      setModels(r.models || []);
      if ((r.models || []).length === 0) setMsg('Không lấy được model — kiểm tra key/URL.');
    } catch (e: any) { setMsg(e.message); } finally { setLoadingModels(false); }
  }
  // tự nạp model khi đổi provider (dùng key đã lưu / hệ thống)
  useEffect(() => { if (user) fetchModels(); /* eslint-disable-next-line */ }, [provider]);

  async function save() {
    setMsg('');
    try {
      await api.patch('/users/me/ai', { provider, model, baseUrl, ...(apiKey ? { apiKey } : {}) });
      setMsg('Đã lưu ✓'); setApiKey(''); setHasKey((h) => h || !!apiKey);
    } catch (e: any) { setMsg(e.message); }
  }
  async function clearKey() {
    if (!confirm('Xoá API key của bạn? AI sẽ dùng cấu hình mặc định của hệ thống.')) return;
    try { await api.patch('/users/me/ai', { apiKey: '' }); setHasKey(false); setApiKey(''); setMsg('Đã xoá key'); } catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><Sparkles className="text-fuchsia-500" /> AI của tôi</h1>
      <p className="text-sm text-ink-500">Tự đấu API key & chọn model riêng cho <b>trợ lý chat Live2D</b>. Hỗ trợ nhiều nguồn — kể cả nguồn OpenAI-compatible không kiểm duyệt (OpenRouter, proxy riêng…). Khi đã có key, chat sẽ dùng cấu hình của bạn.</p>

      <div className="card space-y-3 p-5">
        <label className="block text-sm">Nguồn AI
          <select className="input mt-1" value={provider} onChange={(e) => { const v = e.target.value; setProvider(v); setModel(''); const np = PROVIDERS.find((p) => p.value === v); if (np?.defaultBase !== undefined) setBaseUrl(np.defaultBase); }}>
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {pInfo?.hint && <span className="mt-1 block text-xs text-ink-400">{pInfo.hint}</span>}
        </label>

        {pInfo?.needBase && (
          <label className="block text-sm">Base URL
            <input className="input mt-1" placeholder={pInfo.defaultBase || 'https://…/v1'} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            {provider === 'OPENAI_COMPAT' && (
              <span className="mt-1 flex flex-wrap gap-1">
                {PRESETS.map((p) => <button key={p.url} type="button" onClick={() => setBaseUrl(p.url)} className="rounded bg-ink-100 px-2 py-0.5 text-xs dark:bg-ink-800">{p.label}</button>)}
              </span>
            )}
          </label>
        )}

        <label className="block text-sm">API key {provider === 'OLLAMA' ? '(không cần)' : ''}
          <input className="input mt-1" type="password" autoComplete="off"
            placeholder={hasKey ? '•••••••• (đã lưu — nhập để thay)' : 'Dán API key của bạn…'}
            value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </label>

        <div className="block text-sm">
          <div className="flex items-center justify-between">
            <span>Model</span>
            <button type="button" onClick={fetchModels} disabled={loadingModels} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline disabled:opacity-50">
              <RefreshCw size={12} className={loadingModels ? 'animate-spin' : ''} /> Tải model thực tế
            </button>
          </div>
          <input className="input mt-1" list="ai-models" placeholder="Chọn/nhập model…" value={model} onChange={(e) => setModel(e.target.value)} />
          <datalist id="ai-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
          <span className="mt-1 block text-xs text-ink-400">{models.length > 0 ? `${models.length} model khả dụng (cập nhật realtime từ nguồn).` : 'Bấm "Tải model thực tế" sau khi nhập key để lấy danh sách model mới nhất.'}</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} className="btn-primary">Lưu</button>
          {hasKey && <button onClick={clearKey} className="btn-outline text-sm text-red-600">Xoá key (dùng mặc định)</button>}
          {msg && <span className="text-sm text-brand-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
