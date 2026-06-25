'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ChevronLeft, ImagePlus, Trash2 } from 'lucide-react';
import { api, uploadAttachment, ApiError } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { REASONS } from '@/lib/scam';

const BANKS = [
  'Vietcombank', 'BIDV', 'Agribank', 'Vietinbank', 'Techcombank', 'MB Bank',
  'Sacombank', 'ACB', 'VPBank', 'TPBank', 'OCB', 'SHB', 'LienVietPostBank',
  'HDBank', 'SeABank', 'SCB', 'ABBank', 'NCB', 'Kienlongbank', 'BaoViet Bank',
  'VietBank', 'DongA Bank', 'NamA Bank', 'BacA Bank', 'PVComBank',
  'Woori Bank', 'Standard Chartered', 'HSBC', 'Citibank', 'Khác',
];

export default function NewScamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bank, setBank] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('FRAUD');
  const [description, setDescription] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [images, setImages] = useState<{ url: string; uploading?: boolean }[]>([]);
  const [role, setRole] = useState<'proxy' | 'victim'>('victim');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!loading && !user) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <ShieldAlert size={40} className="mx-auto mb-3 text-rose-500" />
        <p className="font-semibold">Đăng nhập để gửi tố cáo</p>
        <Link href="/login" className="btn-primary mt-4 inline-block">Đăng nhập</Link>
      </div>
    );
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    const slots = Array.from(files).map(() => ({ url: '', uploading: true }));
    setImages((prev) => [...prev, ...slots]);
    const startIdx = images.length;
    await Promise.all(
      Array.from(files).map(async (file, i) => {
        try {
          const { url } = await uploadAttachment(file);
          setImages((prev) => prev.map((img, idx) => idx === startIdx + i ? { url } : img));
        } catch {
          setImages((prev) => prev.filter((_, idx) => idx !== startIdx + i));
        }
      }),
    );
  }

  async function submit() {
    setErr('');
    if (!name.trim() && !bankAccount.trim() && !phone.trim()) {
      setErr('Cần ít nhất một thông tin định danh: tên, số tài khoản hoặc SĐT.');
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setErr('Nội dung tố cáo cần ít nhất 20 ký tự.');
      return;
    }
    if (!images.some((img) => img.url)) {
      setErr('Vui lòng đính kèm ít nhất 1 ảnh bằng chứng (bill chuyển tiền / ảnh chat).');
      return;
    }
    setBusy(true);
    const evidence: any[] = images.filter((img) => img.url).map((img) => ({ kind: 'IMAGE', url: img.url, label: 'Bằng chứng' }));
    if (sourceLink.trim()) evidence.push({ kind: 'LINK', url: sourceLink.trim(), label: 'Link nguồn' });

    try {
      const res = await api.post<{ id: string }>('/scam/cases', {
        targetType: 'USER',
        reason,
        targetName: name.trim() || undefined,
        targetPhone: phone.trim() || undefined,
        targetBankAccount: bankAccount.trim() || undefined,
        targetBank: bank || undefined,
        damageValue: amount ? Number(amount.replace(/\D/g, '')) : undefined,
        title: `Tố cáo ${name.trim() || bankAccount.trim() || phone.trim() || 'đối tượng lừa đảo'}`,
        description: description.trim(),
        evidence,
      });
      router.push(`/scam/detail?id=${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gửi thất bại, thử lại sau.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4">
      <Link href="/scam" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={15} /> Danh sách tố cáo
      </Link>

      <div className="rounded-2xl border-2 border-rose-500 bg-white p-5 shadow-card dark:bg-ink-900">
        <h1 className="mb-4 flex items-center gap-2 text-lg font-bold text-rose-600">
          <ShieldAlert size={22} /> Gửi tố cáo lừa đảo
        </h1>

        {/* Thông tin đối tượng */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Tên người lừa đảo</label>
            <input className="input w-full" placeholder="Nguyen Van A" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Số tài khoản lừa đảo</label>
              <input className="input w-full" placeholder="19036xxxxxx" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Ngân hàng</label>
              <select className="input w-full" value={bank} onChange={(e) => setBank(e.target.value)}>
                <option value="">-- Chọn ngân hàng --</option>
                {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Số tiền chiếm đoạt (VND)</label>
              <input className="input w-full" placeholder="500,000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Số điện thoại lừa đảo</label>
              <input className="input w-full" placeholder="0xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Danh mục <span className="text-rose-500">*</span></label>
            <select className="input w-full" value={reason} onChange={(e) => setReason(e.target.value)}>
              {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Upload ảnh bằng chứng */}
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Ảnh bằng chứng <span className="text-rose-500">*</span>
              <span className="ml-1 text-xs font-normal text-ink-400">(bill chuyển tiền, ảnh đoạn chat lừa đảo)</span>
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300 bg-ink-50 py-6 text-ink-400 transition hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-800/40">
              <ImagePlus size={28} />
              <span className="text-sm">Kéo hoặc click vào đây để upload</span>
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)} />
            </label>
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-ink-200 dark:border-ink-700">
                    {img.uploading
                      ? <div className="grid h-full w-full place-items-center bg-ink-100 text-xs text-ink-400 dark:bg-ink-800">Đang tải…</div>
                      : <img src={img.url} alt="" className="h-full w-full object-cover" />}
                    <button onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-rose-600">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Chờ khoảng 15s để upload ảnh lên server. Bài tố cáo không có ảnh bằng chứng sẽ bị gỡ.
            Bịa đặt vu khống có thể bị phạt 10–50 triệu đồng và phạt tù 3–7 năm (Điều 156 BLHS 2015).
          </p>

          <div>
            <label className="mb-1 block text-sm font-semibold">Nội dung tố cáo <span className="text-rose-500">*</span></label>
            <textarea className="input w-full min-h-[130px]" placeholder="Diễn biến vụ việc, cách thức lừa đảo…"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Link nguồn (nếu có)</label>
            <input className="input w-full" placeholder="http://" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} />
          </div>

          {/* Vai trò người tố cáo */}
          <div className="space-y-2 pt-1">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="radio" name="role" value="proxy" checked={role === 'proxy'} onChange={() => setRole('proxy')}
                className="mt-0.5 accent-rose-600" />
              <span className="text-sm">Phốt này trên group tôi chỉ đăng hộ</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="radio" name="role" value="victim" checked={role === 'victim'} onChange={() => setRole('victim')}
                className="mt-0.5 accent-rose-600" />
              <span className="text-sm">Tôi chính là nạn nhân, tôi đồng ý và sẵn sàng chịu trách nhiệm trước pháp luật về nội dung</span>
            </label>
          </div>
        </div>

        {err && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/30">{err}</p>}

        <button
          onClick={submit} disabled={busy}
          className="mt-5 w-full rounded-xl bg-rose-600 py-3 text-base font-bold uppercase tracking-widest text-white transition hover:bg-rose-700 disabled:opacity-60">
          {busy ? 'Đang gửi…' : 'Gửi duyệt'}
        </button>
      </div>
    </div>
  );
}
