'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Paperclip } from 'lucide-react';

interface Cfg {
  enabled: boolean;
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  region: string;
  publicUrl: string;
  forcePathStyle: boolean;
}

export default function AdminAttachment() {
  const [cfg, setCfg] = useState<Cfg>({ enabled: false, endpoint: '', bucket: '', accessKey: '', secretKey: '', region: 'auto', publicUrl: '', forcePathStyle: true });
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get<Cfg>('/media/admin/attachment').then(setCfg).catch(() => {}); }, []);

  async function save() {
    setMsg('');
    try { const r = await api.post<Cfg>('/media/admin/attachment', cfg); setCfg(r); setMsg('Đã lưu ✓'); setTimeout(() => setMsg(''), 2500); }
    catch (e: any) { setMsg(e.message); }
  }

  const upd = (k: keyof Cfg) => (e: any) => setCfg({ ...cfg, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><Paperclip size={20} /> Tệp đính kèm (Cloudflare R2 / S3)</h1>
      <p className="text-sm text-ink-500">
        Khi bật, tệp đính kèm trong bài viết sẽ được tải lên kho lưu trữ ngoài (Cloudflare R2 hoặc S3) thay vì lưu trên server.
        Nếu tắt, tệp lưu local trên server (thư mục /uploads). R2 dùng region <code>auto</code> và endpoint dạng <code>https://&lt;account&gt;.r2.cloudflarestorage.com</code>.
      </p>

      <div className="card space-y-3 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={cfg.enabled} onChange={upd('enabled')} /> Bật kho lưu trữ ngoài
        </label>
        <div>
          <label className="mb-1 block text-sm text-ink-500">Endpoint</label>
          <input className="input" placeholder="https://<account>.r2.cloudflarestorage.com" value={cfg.endpoint} onChange={upd('endpoint')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm text-ink-500">Bucket</label>
            <input className="input" value={cfg.bucket} onChange={upd('bucket')} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-500">Region</label>
            <input className="input" placeholder="auto" value={cfg.region} onChange={upd('region')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-500">Access Key</label>
          <input className="input" value={cfg.accessKey} onChange={upd('accessKey')} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-500">Secret Key</label>
          <input className="input" type="password" value={cfg.secretKey} onChange={upd('secretKey')} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-500">Public URL (tên miền công khai trỏ tới bucket)</label>
          <input className="input" placeholder="https://files.example.com" value={cfg.publicUrl} onChange={upd('publicUrl')} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cfg.forcePathStyle} onChange={upd('forcePathStyle')} /> Path-style (R2: bật)
        </label>
        <div className="flex items-center gap-3">
          <button onClick={save} className="btn-primary">Lưu</button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
