'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';

interface Setting { id: string; key: string; label: string; type: string; value: any; options?: any; validation?: any; isSecret?: boolean; }
interface Group { id: string; key: string; name: string; description?: string; icon?: string; settings: Setting[]; }

function ConfigGroupView() {
  const groupKey = useSearchParams().get('group') || '';
  const [group, setGroup] = useState<Group | null>(null);
  const [msg, setMsg] = useState('');
  const [dirty, setDirty] = useState<Record<string, any>>({});

  function load() {
    api.get<Group[]>('/admin/config').then((gs) => setGroup(gs.find((g) => g.key === groupKey) || null)).catch((e) => setMsg(e.message));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [groupKey]);

  async function saveOne(key: string) {
    try { await api.patch(`/admin/config/setting/${key}`, { value: dirty[key] }); setMsg('Đã lưu ' + key);
      setDirty((d) => { const n = { ...d }; delete n[key]; return n; });
    } catch (e: any) { setMsg(e.message); }
  }
  async function saveAll() {
    for (const key of Object.keys(dirty)) await saveOne(key);
    setMsg('Đã lưu tất cả ✓');
  }

  const setVal = (key: string, v: any) => setDirty((d) => ({ ...d, [key]: v }));
  const cur = (s: Setting) => (s.key in dirty ? dirty[s.key] : s.value);

  return (
    <div className="space-y-4">
      <Link href="/admin/settings" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Tất cả cấu hình</Link>
      {!group ? (
        <div className="card p-6 text-center text-ink-500">{msg || 'Đang tải…'}</div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{group.name}</h1>
              {group.description && <p className="text-sm text-ink-500">{group.description}</p>}
            </div>
            <button onClick={saveAll} disabled={Object.keys(dirty).length === 0} className="btn-primary text-sm disabled:opacity-40">Lưu tất cả ({Object.keys(dirty).length})</button>
          </div>
          {msg && <p className="text-sm text-brand-600">{msg}</p>}
          {group.key === 'ai' && (
            <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
              Cấu hình AI chat (nguồn/API key/model) giờ do <b>người dùng tự đặt</b> trong trang Chat AI, và key hệ thống/luận giải đặt ở <b>Bói toán & AI</b>. Ở đây chỉ còn điểm thân thiết lên cấp.
            </p>
          )}
          <section className="card divide-y divide-ink-100 p-0 dark:divide-ink-800">
            {group.settings.filter((s) => group.key !== 'ai' || s.key.includes('bond')).map((s) => (
              <div key={s.key} className="grid grid-cols-1 items-center gap-2 p-4 sm:grid-cols-[260px_1fr_auto]">
                <label className="text-sm font-medium">{s.label}<div className="text-[11px] font-normal text-ink-400">{s.key}{s.isSecret ? ' · bí mật' : ''}</div></label>
                <Field s={s} value={cur(s)} onChange={(v) => setVal(s.key, v)} />
                <button onClick={() => saveOne(s.key)} disabled={!(s.key in dirty)} className="btn-primary !py-1 text-xs disabled:opacity-40">Lưu</button>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function Field({ s, value, onChange }: { s: Setting; value: any; onChange: (v: any) => void }) {
  const opts = s.options?.options || s.validation?.options;
  switch (s.type) {
    case 'boolean':
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
    case 'number':
      return <input type="number" className="input" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />;
    case 'textarea':
      return <textarea className="input resize-y" rows={2} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'color':
      return <input type="color" className="h-9 w-16" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />;
    case 'image':
      return (
        <div className="space-y-2">
          {value && /^https?:|^\//.test(value) && <img src={value} alt="" className="h-12 w-auto rounded border border-ink-200 object-contain dark:border-ink-700" />}
          <ImageUpload value={value} onUploaded={(url) => onChange(url)} label="Tải ảnh lên" />
          <input className="input text-xs" placeholder="hoặc dán URL ảnh" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          {value && <button type="button" onClick={() => onChange('')} className="text-xs text-red-500 hover:underline">Xoá ảnh</button>}
        </div>
      );
    case 'select':
      return (
        <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {(opts || []).map((o: any) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o.value ?? o}</option>)}
        </select>
      );
    default:
      return <input className="input" type={s.isSecret ? 'password' : 'text'} autoComplete="off" placeholder={s.isSecret && value === '••••••••' ? 'đã đặt — nhập để thay' : ''} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

export default function AdminConfigGroupPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <ConfigGroupView />
    </Suspense>
  );
}
