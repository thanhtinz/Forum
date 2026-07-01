'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Trash2, Upload } from 'lucide-react';
import { api, uploadAttachment, ApiError } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { EVIDENCE_KINDS } from '@/lib/scam';

type Ev = { kind: string; url?: string; label?: string };

function EditScam() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [damageValue, setDamageValue] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [evidence, setEvidence] = useState<Ev[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<any>(`/scam/cases/${id}`).then((c) => {
      setTitle(c.title); setDescription(c.description);
      setDamageValue(c.damageValue ? String(c.damageValue) : '');
      setOrderRef(c.orderRef || '');
      setEvidence((c.evidence || []).map((e: any) => ({ kind: e.kind, url: e.url, label: e.label })));
      setReady(true);
    }).catch(() => setErr('Không tải được báo cáo'));
  }, [id]);

  if (!loading && !user) return <div className="card m-6 p-10 text-center">Đăng nhập để sửa.</div>;
  if (!ready) return <div className="container-forum py-10 text-center text-ink-500">Đang tải…</div>;

  function setEv(i: number, patch: Partial<Ev>) { setEvidence((arr) => arr.map((e, idx) => idx === i ? { ...e, ...patch } : e)); }
  async function uploadFor(i: number, file: File) {
    try { const { url } = await uploadAttachment(file); setEv(i, { url }); } catch (e: any) { setErr(e?.message || 'Upload lỗi'); }
  }

  async function save() {
    setErr(''); setBusy(true);
    try {
      await api.patch(`/scam/cases/${id}`, {
        title: title.trim(), description: description.trim(),
        damageValue: damageValue ? Number(damageValue) : undefined,
        orderRef: orderRef.trim() || undefined,
        evidence: evidence.filter((e) => e.url || e.label),
      });
      router.push(`/scam/detail?id=${id}`);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Lưu thất bại'); setBusy(false); }
  }

  return (
    <div className="container-forum max-w-3xl space-y-4 py-5">
      <Link href={`/scam/detail?id=${id}`} className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Quay lại</Link>
      <h1 className="text-xl font-bold">Sửa báo cáo</h1>
      <div className="card space-y-3 p-5">
        <label className="block text-sm">Tiêu đề<input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block text-sm">Mô tả<textarea className="input mt-1 min-h-[140px]" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Thiệt hại (₫)<input type="number" className="input mt-1" value={damageValue} onChange={(e) => setDamageValue(e.target.value)} /></label>
          <label className="block text-sm">ID đơn hàng<input className="input mt-1" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} /></label>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Bằng chứng</p>
          {evidence.map((e, i) => (
            <div key={i} className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-ink-200 p-2 dark:border-ink-800">
              <select className="input w-auto" value={e.kind} onChange={(ev) => setEv(i, { kind: ev.target.value })}>
                {Object.entries(EVIDENCE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {e.kind === 'LINK' || e.kind === 'CRYPTO_TX' || e.kind === 'SYSTEM_MSG' ? (
                <input className="input flex-1" placeholder="Nội dung/Link" value={e.kind === 'LINK' ? (e.url || '') : (e.label || '')}
                  onChange={(ev) => setEv(i, e.kind === 'LINK' ? { url: ev.target.value } : { label: ev.target.value })} />
              ) : (
                <label className="btn-outline cursor-pointer"><Upload size={14} /> {e.url ? '✓' : 'Tải file'}
                  <input type="file" className="hidden" onChange={(ev) => ev.target.files?.[0] && uploadFor(i, ev.target.files[0])} /></label>
              )}
              <input className="input flex-1" placeholder="Ghi chú" value={e.label || ''} onChange={(ev) => setEv(i, { label: ev.target.value })} />
              <button className="btn-ghost text-rose-500" onClick={() => setEvidence((arr) => arr.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
            </div>
          ))}
          <button className="btn-outline" onClick={() => setEvidence((arr) => [...arr, { kind: 'IMAGE' }])}><Plus size={14} /> Thêm</button>
        </div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
      </div>
    </div>
  );
}

export default function EditScamPage() {
  return <Suspense fallback={<div className="container-forum py-10 text-center text-ink-500">Đang tải…</div>}><EditScam /></Suspense>;
}
