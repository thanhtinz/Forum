'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ImagePlus } from 'lucide-react';

interface ImageHostConfig {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
}

export default function AdminImageHost() {
  const [cfg, setCfg] = useState<ImageHostConfig>({ enabled: false, endpoint: '', apiKey: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<ImageHostConfig>('/media/admin/imagehost')
      .then((c) => setCfg({ enabled: !!c.enabled, endpoint: c.endpoint || '', apiKey: c.apiKey || '' }))
      .catch((e) => setMsg(e.message));
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api.post('/media/admin/imagehost', {
        enabled: cfg.enabled,
        endpoint: cfg.endpoint,
        apiKey: cfg.apiKey,
      });
      setMsg('Đã lưu cấu hình ✓');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><ImagePlus size={20} /> Lưu trữ ảnh ngoài</h1>
      </div>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      <div className="card p-4">
        <p className="mb-4 text-sm text-ink-500">
          Khi bật, ảnh chèn trong bài viết sẽ được tải lên dịch vụ lưu trữ ảnh ngoài
          (ví dụ zpic.live hoặc anh.moe) thay vì lưu trên server, giúp tiết kiệm dung lượng.
          Lấy API key tại trang quản lý của dịch vụ và dán vào ô bên dưới.
        </p>
        <form onSubmit={save} className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            />
            Bật dịch vụ ảnh ngoài
          </label>
          <div>
            <label className="mb-1 block text-sm text-ink-500">Endpoint (URL upload)</label>
            <input
              className="input"
              placeholder="https://zpic.live/api/1/upload"
              value={cfg.endpoint}
              onChange={(e) => setCfg({ ...cfg, endpoint: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-500">API Key</label>
            <input
              className="input"
              type="password"
              placeholder="Dán API key của dịch vụ…"
              value={cfg.apiKey}
              onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
