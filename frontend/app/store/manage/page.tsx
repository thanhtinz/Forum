'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Store { id: string; slug: string; name: string; tagline?: string; description?: string; bannerUrl?: string; logoUrl?: string; policyRefund?: string; }

export default function ManageStore() {
  const { user, loading } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [form, setForm] = useState<any>({ name: '', tagline: '', description: '', bannerUrl: '', logoUrl: '', policyRefund: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (loading || !user) return;
    api.get<Store | null>('/marketplace/me/storefront').then((s) => {
      if (s) { setStore(s); setHasStore(true); setForm({ name: s.name, tagline: s.tagline || '', description: s.description || '', bannerUrl: s.bannerUrl || '', logoUrl: s.logoUrl || '', policyRefund: s.policyRefund || '' }); }
      else setHasStore(false);
    }).catch(() => setHasStore(false));
  }, [user, loading]);

  const upd = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setMsg('');
    try {
      if (hasStore) { const s = await api.patch<Store>('/marketplace/storefront', form); setStore(s); setMsg('Đã cập nhật ✓'); }
      else { const s = await api.post<Store>('/marketplace/storefront', form); setStore(s); setHasStore(true); setMsg('Đã tạo gian hàng ✓'); }
    } catch (e: any) { setMsg(e.message); }
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để quản lý gian hàng.</div>;
  if (hasStore === null) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{hasStore ? 'Quản lý gian hàng' : 'Tạo gian hàng'}</h1>
        {store && <Link href={`/store?slug=${store.slug}`} className="btn-outline text-xs">Xem gian hàng</Link>}
      </div>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}
      <div className="card space-y-3 p-5">
        <Field label="Tên gian hàng" value={form.name} onChange={upd('name')} />
        <Field label="Slogan" value={form.tagline} onChange={upd('tagline')} />
        <Field label="Logo URL" value={form.logoUrl} onChange={upd('logoUrl')} />
        <Field label="Banner URL" value={form.bannerUrl} onChange={upd('bannerUrl')} />
        <label className="block text-sm">Giới thiệu<textarea className="input mt-1 resize-y" rows={4} value={form.description} onChange={upd('description')} /></label>
        <label className="block text-sm">Chính sách<textarea className="input mt-1 resize-y" rows={3} value={form.policyRefund} onChange={upd('policyRefund')} /></label>
        <button onClick={save} className="btn-primary">{hasStore ? 'Lưu thay đổi' : 'Tạo gian hàng'}</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (e: any) => void }) {
  return <label className="block text-sm">{label}<input className="input mt-1" value={value} onChange={onChange} /></label>;
}
