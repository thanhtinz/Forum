'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Plus, Trash2, Upload, ChevronLeft } from 'lucide-react';
import { api, uploadAttachment, ApiError } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { TARGET_TYPES, REASONS, EVIDENCE_KINDS } from '@/lib/scam';

type Ev = { kind: string; url?: string; label?: string };
const NO_URL = ['CRYPTO_TX', 'SYSTEM_MSG']; // các loại dùng text thay vì file

export default function NewScamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [targetType, setTargetType] = useState('USER');
  const [reason, setReason] = useState('FRAUD');
  const [reportedUsername, setReportedUsername] = useState('');
  const [t, setT] = useState({ targetName: '', targetUid: '', targetEmail: '', targetPhone: '', targetWallet: '', targetDomain: '', targetDiscord: '', targetTelegram: '', targetFacebook: '', targetZalo: '' });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [damageValue, setDamageValue] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [evidence, setEvidence] = useState<Ev[]>([{ kind: 'IMAGE' }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!loading && !user) return <div className="card m-6 p-10 text-center">Đăng nhập để gửi tố cáo.</div>;

  function setEv(i: number, patch: Partial<Ev>) { setEvidence((arr) => arr.map((e, idx) => idx === i ? { ...e, ...patch } : e)); }
  async function uploadFor(i: number, file: File) {
    try { const { url } = await uploadAttachment(file); setEv(i, { url }); }
    catch (e: any) { setErr(e?.message || 'Upload lỗi'); }
  }

  async function submit() {
    setErr('');
    const ev = evidence.filter((e) => e.url || e.label);
    if (!ev.length) { setErr('Cần ít nhất 1 bằng chứng (file hoặc nội dung)'); return; }
    setBusy(true);
    try {
      let reportedUserId: string | undefined;
      if (reportedUsername.trim()) {
        // tìm userId theo username
        try {
          const u = await api.get<any>(`/users/${encodeURIComponent(reportedUsername.trim())}`);
          reportedUserId = u?.id;
        } catch { /* bỏ qua, dùng targetName */ }
      }
      const payload: any = {
        targetType, reason, reportedUserId,
        ...Object.fromEntries(Object.entries(t).filter(([, v]) => v.trim())),
        title: title.trim(), description: description.trim(),
        damageValue: damageValue ? Number(damageValue) : undefined,
        incidentDate: incidentDate ? new Date(incidentDate).toISOString() : undefined,
        orderRef: orderRef.trim() || undefined,
        evidence: ev,
      };
      if (!payload.targetName && reportedUsername.trim() && !reportedUserId) payload.targetName = reportedUsername.trim();
      const res = await api.post<{ id: string }>('/scam/cases', payload);
      router.push(`/scam/detail?id=${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gửi thất bại');
      setBusy(false);
    }
  }

  return (
    <div className="container-forum max-w-3xl space-y-4 py-5">
      <Link href="/scam" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Danh sách tố cáo</Link>
      <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert className="text-rose-600" /> Tạo báo cáo tố cáo</h1>

      <div className="card space-y-4 p-5">
        {/* Đối tượng & lý do */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Loại đối tượng
            <select className="input mt-1" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              {Object.entries(TARGET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block text-sm">Lý do tố cáo
            <select className="input mt-1" value={reason} onChange={(e) => setReason(e.target.value)}>
              {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        {/* Định danh đối tượng */}
        <div>
          <p className="mb-1 text-sm font-medium">Thông tin định danh <span className="text-ink-400">(điền tối thiểu 1)</span></p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder="Username trên hệ thống" value={reportedUsername} onChange={(e) => setReportedUsername(e.target.value)} />
            <input className="input" placeholder="Tên / biệt danh" value={t.targetName} onChange={(e) => setT({ ...t, targetName: e.target.value })} />
            <input className="input" placeholder="UID" value={t.targetUid} onChange={(e) => setT({ ...t, targetUid: e.target.value })} />
            <input className="input" placeholder="Email" value={t.targetEmail} onChange={(e) => setT({ ...t, targetEmail: e.target.value })} />
            <input className="input" placeholder="Số điện thoại" value={t.targetPhone} onChange={(e) => setT({ ...t, targetPhone: e.target.value })} />
            <input className="input" placeholder="Ví crypto" value={t.targetWallet} onChange={(e) => setT({ ...t, targetWallet: e.target.value })} />
            <input className="input" placeholder="Domain website" value={t.targetDomain} onChange={(e) => setT({ ...t, targetDomain: e.target.value })} />
            <input className="input" placeholder="Discord ID" value={t.targetDiscord} onChange={(e) => setT({ ...t, targetDiscord: e.target.value })} />
            <input className="input" placeholder="Telegram" value={t.targetTelegram} onChange={(e) => setT({ ...t, targetTelegram: e.target.value })} />
            <input className="input" placeholder="Facebook" value={t.targetFacebook} onChange={(e) => setT({ ...t, targetFacebook: e.target.value })} />
            <input className="input" placeholder="Zalo" value={t.targetZalo} onChange={(e) => setT({ ...t, targetZalo: e.target.value })} />
          </div>
          <p className="mt-1 text-xs text-ink-400">SĐT / email / ví sẽ được ẩn một phần khi hiển thị công khai.</p>
        </div>

        {/* Nội dung */}
        <label className="block text-sm">Tiêu đề
          <input className="input mt-1" placeholder="Tóm tắt vụ việc" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm">Mô tả chi tiết
          <textarea className="input mt-1 min-h-[140px]" placeholder="Diễn biến, cách thức lừa đảo…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">Thiệt hại (₫)
            <input type="number" className="input mt-1" value={damageValue} onChange={(e) => setDamageValue(e.target.value)} />
          </label>
          <label className="block text-sm">Ngày xảy ra
            <input type="date" className="input mt-1" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
          </label>
          <label className="block text-sm">ID đơn hàng
            <input className="input mt-1" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} />
          </label>
        </div>

        {/* Bằng chứng */}
        <div>
          <p className="mb-1 text-sm font-medium">Bằng chứng <span className="text-rose-500">*bắt buộc</span></p>
          <div className="space-y-2">
            {evidence.map((e, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-200 p-2 dark:border-ink-800">
                <select className="input w-auto" value={e.kind} onChange={(ev) => setEv(i, { kind: ev.target.value, url: undefined })}>
                  {Object.entries(EVIDENCE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {NO_URL.includes(e.kind) || e.kind === 'LINK' ? (
                  <input className="input flex-1" placeholder={e.kind === 'CRYPTO_TX' ? 'Hash giao dịch' : e.kind === 'LINK' ? 'https://…' : 'Nội dung tin nhắn'}
                    value={e.kind === 'LINK' ? (e.url || '') : (e.label || '')}
                    onChange={(ev) => setEv(i, e.kind === 'LINK' ? { url: ev.target.value } : { label: ev.target.value })} />
                ) : (
                  <label className="btn-outline cursor-pointer">
                    <Upload size={14} /> {e.url ? 'Đã tải lên ✓' : 'Tải file'}
                    <input type="file" className="hidden" onChange={(ev) => ev.target.files?.[0] && uploadFor(i, ev.target.files[0])} />
                  </label>
                )}
                <input className="input flex-1" placeholder="Ghi chú (tùy chọn)" value={e.label || ''} onChange={(ev) => setEv(i, { label: ev.target.value })} />
                <button className="btn-ghost text-rose-500" onClick={() => setEvidence((arr) => arr.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <button className="btn-outline mt-2" onClick={() => setEvidence((arr) => [...arr, { kind: 'IMAGE' }])}><Plus size={14} /> Thêm bằng chứng</button>
        </div>

        {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-600 dark:bg-rose-900/30">{err}</p>}
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-400">Tố cáo sai sự thật có thể bị xử lý. Bên bị tố cáo được quyền phản hồi.</p>
          <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? 'Đang gửi…' : 'Gửi tố cáo'}</button>
        </div>
      </div>
    </div>
  );
}
