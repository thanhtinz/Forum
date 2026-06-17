'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Paperclip, X, Loader2 } from 'lucide-react';
import { api, uploadAttachment } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import TipTapEditor from '@/components/TipTapEditor';
import { CATEGORIES, catLabel, BUDGET_TYPE_LABELS, parseList } from '@/lib/jobs';

export default function NewJobPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('PROGRAMMING');
  const [description, setDescription] = useState('');
  const [budgetType, setBudgetType] = useState('FIXED');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [skills, setSkills] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a> để đăng việc.</div>;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const r = await uploadAttachment(f);
        setAttachments((prev) => [...prev, { url: r.url, name: r.filename || f.name }]);
      }
    } catch (e: any) { setErr(e.message || 'Tải tệp thất bại'); }
    finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setErr('Nhập tiêu đề'); return; }
    setBusy(true); setErr('');
    try {
      const body: any = {
        title: title.trim(),
        category,
        description,
        budgetType,
        skills: parseList(skills),
      };
      if (budgetMin) body.budgetMin = Number(budgetMin);
      if (budgetMax) body.budgetMax = Number(budgetMax);
      if (deadline) body.deadline = deadline;
      if (country.trim()) body.country = country.trim();
      if (language.trim()) body.language = language.trim();
      if (attachments.length) body.attachments = attachments;
      const job = await api.post<{ id: string }>('/jobs', body);
      router.push(`/job?id=${job.id}`);
    } catch (e: any) { setErr(e.message || 'Đăng việc thất bại'); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Plus size={22} /> Đăng việc mới</h1>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Tiêu đề</label>
          <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vd: Cần thiết kế logo cho startup" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Danh mục</label>
            <select className="input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Loại ngân sách</label>
            <select className="input w-full" value={budgetType} onChange={(e) => setBudgetType(e.target.value)}>
              {Object.entries(BUDGET_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Mô tả</label>
          <TipTapEditor value={description} onChange={setDescription} placeholder="Mô tả chi tiết yêu cầu công việc…" autosaveKey="job-new-desc" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Ngân sách tối thiểu (gem)</label>
            <input className="input w-full" type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ngân sách tối đa (gem)</label>
            <input className="input w-full" type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Hạn chót</label>
            <input className="input w-full" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Kỹ năng (phân tách bằng dấu phẩy)</label>
          <input className="input w-full" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, NodeJS, Figma" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Quốc gia</label>
            <input className="input w-full" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Việt Nam" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ngôn ngữ</label>
            <input className="input w-full" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Tiếng Việt" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Tệp đính kèm</label>
          <label className="btn-outline inline-flex cursor-pointer items-center gap-2 !py-1.5 text-sm">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            {uploading ? 'Đang tải…' : 'Thêm tệp'}
            <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {attachments.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-1.5 text-sm dark:border-ink-800">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="truncate text-brand-600">{a.name}</a>
                  <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-ink-400 hover:text-red-500"><X size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {err && <p className="text-sm text-red-500">{err}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Đang đăng…' : 'Đăng việc'}</button>
        </div>
      </form>
    </div>
  );
}
