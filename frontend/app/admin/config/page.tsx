'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, Save, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import { PageHeader, Card, Notice, Btn } from '@/components/admin/ui';

interface Setting { id: string; key: string; label: string; description?: string; type: string; value: any; options?: any; validation?: any; isSecret?: boolean; }
interface Group { id: string; key: string; name: string; description?: string; icon?: string; settings: Setting[]; }

// Chuẩn hoá danh sách lựa chọn cho field select: options có thể là mảng [{label,value}]
// (cách lưu trong DB) HOẶC dạng cũ { options: [...] } / validation.options.
function getOptions(s: Setting): { label: string; value: any }[] {
  const raw = Array.isArray(s.options) ? s.options
    : Array.isArray(s.options?.options) ? s.options.options
    : Array.isArray(s.validation?.options) ? s.validation.options
    : [];
  return raw.map((o: any) => (typeof o === 'object' ? { label: o.label ?? o.value, value: o.value } : { label: String(o), value: o }));
}

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
    try {
      await api.patch(`/admin/config/setting/${key}`, { value: dirty[key] });
      setDirty((d) => { const n = { ...d }; delete n[key]; return n; });
      setMsg('Đã lưu ' + key);
    } catch (e: any) { setMsg(e.message); }
  }
  async function saveAll() {
    for (const key of Object.keys(dirty)) await saveOne(key);
    setMsg('Đã lưu tất cả thay đổi ✓');
  }

  const setVal = (key: string, v: any) => setDirty((d) => ({ ...d, [key]: v }));
  const cur = (s: Setting) => (s.key in dirty ? dirty[s.key] : s.value);
  const dirtyCount = Object.keys(dirty).length;

  const visibleSettings = group?.settings || [];

  return (
    <div className="space-y-5">
      <Link href="/admin/settings" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Tất cả cấu hình</Link>

      {!group ? (
        <Card><div className="py-6 text-center text-ink-500">{msg || 'Đang tải…'}</div></Card>
      ) : (
        <>
          <PageHeader
            title={group.name}
            desc={group.description}
            actions={<Btn onClick={saveAll} disabled={dirtyCount === 0}><Save size={15} /> Lưu tất cả{dirtyCount > 0 ? ` (${dirtyCount})` : ''}</Btn>}
          />

          {msg && <Notice kind="success">{msg}</Notice>}
          {group.key === 'ai' && (
            <Notice kind="info">Cấu hình AI chat (nguồn/API key/model) do <b>người dùng tự đặt</b> trong trang Chat AI; key hệ thống đặt ở <b>Bói toán &amp; AI</b>. Ở đây chỉ còn điểm thân thiết lên cấp.</Notice>
          )}

          <Card pad={false} className="divide-y divide-ink-100 dark:divide-ink-800">
            {visibleSettings.map((s) => {
              const isDirty = s.key in dirty;
              return (
                <div key={s.key} className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-[280px_1fr_auto] sm:items-start">
                  <div className="pt-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {s.label}{s.isSecret && <Lock size={12} className="text-ink-400" />}
                    </div>
                    {s.description && <p className="mt-0.5 text-[11px] text-ink-400">{s.description}</p>}
                    <p className="mt-0.5 font-mono text-[10px] text-ink-300">{s.key}</p>
                  </div>
                  <div className="min-w-0">
                    <Field s={s} value={cur(s)} onChange={(v) => setVal(s.key, v)} />
                  </div>
                  <Btn size="sm" variant={isDirty ? 'primary' : 'outline'} disabled={!isDirty} onClick={() => saveOne(s.key)}>Lưu</Btn>
                </div>
              );
            })}
            {visibleSettings.length === 0 && <div className="py-8 text-center text-sm text-ink-400">Nhóm này chưa có mục cấu hình.</div>}
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ s, value, onChange }: { s: Setting; value: any; onChange: (v: any) => void }) {
  switch (s.type) {
    case 'boolean':
      return (
        <button type="button" onClick={() => onChange(!value)} className="inline-flex items-center gap-2 text-sm">
          <span className={`relative h-5 w-9 rounded-full transition ${value ? 'bg-brand-600' : 'bg-ink-300 dark:bg-ink-700'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${value ? 'left-4' : 'left-0.5'}`} />
          </span>
          <span className="text-ink-500">{value ? 'Bật' : 'Tắt'}</span>
        </button>
      );
    case 'number':
      return <input type="number" className="input max-w-xs" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />;
    case 'textarea':
      return <textarea className="input resize-y" rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input type="color" className="h-9 w-12 rounded border border-ink-200 dark:border-ink-700" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
          <input className="input max-w-[120px]" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'image':
      return (
        <div className="space-y-2">
          {value && /^https?:|^\//.test(value) && <img src={value} alt="" className="h-14 w-auto rounded-lg border border-ink-200 object-contain dark:border-ink-700" />}
          <ImageUpload value={value} onUploaded={(url) => onChange(url)} label="Tải ảnh lên" />
          <input className="input text-xs" placeholder="hoặc dán URL ảnh" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          {value && <button type="button" onClick={() => onChange('')} className="text-xs text-rose-500 hover:underline">Xoá ảnh</button>}
        </div>
      );
    case 'select': {
      const opts = getOptions(s);
      return (
        <select className="input max-w-xs" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {opts.length === 0 && <option value="">(chưa có lựa chọn)</option>}
          {opts.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    default:
      return (
        <input
          className="input"
          type={s.isSecret ? 'password' : 'text'}
          autoComplete="off"
          placeholder={s.isSecret ? (value ? 'đã đặt — nhập để thay' : 'chưa đặt') : ''}
          value={typeof value === 'string' && value === '••••••••' ? '' : (value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export default function AdminConfigGroupPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <ConfigGroupView />
    </Suspense>
  );
}
