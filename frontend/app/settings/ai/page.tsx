'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

// Gợi ý model phổ biến theo provider
const MODELS: Record<string, string[]> = {
  GEMINI: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  OPENAI: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-3.5-turbo'],
  OLLAMA: ['llama3.1', 'qwen2.5', 'mistral'],
};

export default function UserAiSettings() {
  const { user, loading } = useAuth();
  const [provider, setProvider] = useState('GEMINI');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get<{ provider: string; model: string; hasKey: boolean }>('/users/me/ai').then((r) => {
      if (r.provider) setProvider(r.provider);
      setModel(r.model || '');
      setHasKey(r.hasKey);
    }).catch(() => {});
  }, [user]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để cấu hình AI.</div>;

  async function save() {
    setMsg('');
    try {
      await api.patch('/users/me/ai', { provider, model, ...(apiKey ? { apiKey } : {}) });
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
      <p className="text-sm text-ink-500">Tự đấu API key (Gemini/OpenAI) và chọn model riêng. Khi đã có key, trợ lý AI sẽ dùng key + model của bạn thay cho mặc định hệ thống.</p>

      <div className="card space-y-3 p-5">
        <label className="block text-sm">Nhà cung cấp
          <select className="input mt-1" value={provider} onChange={(e) => { setProvider(e.target.value); setModel(''); }}>
            <option value="GEMINI">Google Gemini</option>
            <option value="OPENAI">OpenAI</option>
            <option value="OLLAMA">Ollama (tự host)</option>
          </select>
        </label>

        <label className="block text-sm">Model
          <input className="input mt-1" list="ai-models" placeholder="Chọn hoặc nhập model…" value={model} onChange={(e) => setModel(e.target.value)} />
          <datalist id="ai-models">
            {(MODELS[provider] || []).map((m) => <option key={m} value={m} />)}
          </datalist>
          <span className="mt-1 block text-xs text-ink-400">Gợi ý: {(MODELS[provider] || []).join(', ')}</span>
        </label>

        <label className="block text-sm">API key {provider === 'OLLAMA' ? '(Base URL)' : ''}
          <input className="input mt-1" type="password" autoComplete="off"
            placeholder={hasKey ? '•••••••• (đã lưu — nhập để thay)' : (provider === 'OLLAMA' ? 'http://localhost:11434' : 'Dán API key của bạn…')}
            value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          <span className="mt-1 block text-xs text-ink-400">Key được lưu ở server, chỉ dùng cho tài khoản của bạn. {hasKey && 'Bạn đang dùng key riêng.'}</span>
        </label>

        <div className="flex items-center gap-3">
          <button onClick={save} className="btn-primary">Lưu</button>
          {hasKey && <button onClick={clearKey} className="btn-outline text-sm text-red-600">Xoá key (dùng mặc định)</button>}
          {msg && <span className="text-sm text-brand-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
