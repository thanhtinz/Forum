'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Save, UserCog, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import ImageUpload from '@/components/ImageUpload';
import { parseList, type FreelancerProfile } from '@/lib/jobs';

interface PortfolioItem { title: string; url: string; image?: string }

export default function FreelancerSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [country, setCountry] = useState('');
  const [languages, setLanguages] = useState('');
  const [experience, setExperience] = useState('');
  const [certifications, setCertifications] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [cvBusy, setCvBusy] = useState(false);
  const [cvResult, setCvResult] = useState('');

  async function analyzeCv() {
    const text = [headline && `Tiêu đề: ${headline}`, bio && `Giới thiệu: ${bio}`, skills && `Kỹ năng: ${skills}`, experience && `Kinh nghiệm: ${experience}`, certifications && `Chứng chỉ: ${certifications}`].filter(Boolean).join('\n');
    if (!text.trim()) { setErr('Hãy điền hồ sơ trước khi nhờ AI phân tích.'); return; }
    setErr(''); setCvBusy(true); setCvResult('');
    try {
      const r = await api.post<{ result: string }>('/jobs/ai/analyze-cv', { text });
      setCvResult(r.result || '');
    } catch (e: any) { setErr('AI lỗi: ' + (e?.message || 'không xác định')); }
    finally { setCvBusy(false); }
  }

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get<FreelancerProfile | null>('/freelancers/me/profile')
      .then((p) => {
        if (!p) return;
        setHeadline(p.headline || '');
        setBio(p.bio || '');
        setSkills((p.skills || []).join(', '));
        setHourlyRate(p.hourlyRate != null ? String(p.hourlyRate) : '');
        setCountry(p.country || '');
        setLanguages((p.languages || []).join(', '));
        setExperience(p.experience || '');
        setCertifications((p.certifications || []).join(', '));
        setPortfolio(p.portfolio || []);
        setAvailable(p.available ?? true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  function updatePortfolio(i: number, patch: Partial<PortfolioItem>) {
    setPortfolio((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(''); setErr('');
    try {
      const body: any = {
        headline,
        bio,
        skills: parseList(skills),
        country: country.trim() || undefined,
        languages: parseList(languages),
        portfolio: portfolio.filter((p) => p.title.trim() || p.url.trim()),
        experience: experience.trim() || undefined,
        certifications: parseList(certifications),
        available,
      };
      if (hourlyRate) body.hourlyRate = Number(hourlyRate);
      await api.post('/freelancers/me/profile', body);
      setMsg('Đã lưu hồ sơ.');
    } catch (e: any) { setErr(e.message || 'Lưu thất bại'); }
    finally { setBusy(false); }
  }

  if (authLoading || loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a>.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><UserCog size={22} /> Hồ sơ Freelancer</h1>
      <form onSubmit={save} className="card space-y-4 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Tiêu đề (headline)</label>
          <input className="input w-full" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Vd: Lập trình viên Full-stack" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Giới thiệu</label>
          <textarea className="input min-h-[120px] w-full" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Kỹ năng (phân tách bằng dấu phẩy)</label>
          <input className="input w-full" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, NodeJS, UI/UX" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Giá theo giờ (gem)</label>
            <input className="input w-full" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Quốc gia</label>
            <input className="input w-full" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ngôn ngữ (phân tách bằng dấu phẩy)</label>
          <input className="input w-full" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Tiếng Việt, English" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Kinh nghiệm</label>
          <textarea className="input min-h-[100px] w-full" value={experience} onChange={(e) => setExperience(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Chứng chỉ (phân tách bằng dấu phẩy)</label>
          <input className="input w-full" value={certifications} onChange={(e) => setCertifications(e.target.value)} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">Portfolio</label>
            <button type="button" onClick={() => setPortfolio((prev) => [...prev, { title: '', url: '', image: '' }])} className="btn-outline inline-flex items-center gap-1 !py-1 text-xs"><Plus size={14} /> Thêm mục</button>
          </div>
          <div className="space-y-3">
            {portfolio.map((item, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-500">Mục #{i + 1}</span>
                  <button type="button" onClick={() => setPortfolio((prev) => prev.filter((_, j) => j !== i))} className="text-ink-400 hover:text-red-500"><X size={15} /></button>
                </div>
                <input className="input w-full" placeholder="Tiêu đề" value={item.title} onChange={(e) => updatePortfolio(i, { title: e.target.value })} />
                <input className="input w-full" placeholder="Link" value={item.url} onChange={(e) => updatePortfolio(i, { url: e.target.value })} />
                <ImageUpload value={item.image} onUploaded={(url) => updatePortfolio(i, { image: url })} label="Ảnh minh hoạ" />
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> Đang nhận việc
        </label>

        {cvResult && (
          <div className="rounded-xl border border-brand-300 bg-brand-50/50 p-3 text-sm dark:border-brand-800 dark:bg-brand-950/20">
            <div className="mb-1 flex items-center gap-1 font-medium text-brand-700 dark:text-brand-400"><Sparkles size={14} /> AI phân tích hồ sơ</div>
            <p className="whitespace-pre-wrap text-ink-700 dark:text-ink-200">{cvResult}</p>
          </div>
        )}
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        {err && <p className="text-sm text-red-500">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={analyzeCv} disabled={cvBusy} className="btn-outline inline-flex items-center gap-1 disabled:opacity-50"><Sparkles size={16} /> {cvBusy ? 'Đang phân tích…' : 'AI phân tích hồ sơ'}</button>
          <button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-1 disabled:opacity-50"><Save size={16} /> {busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
        </div>
      </form>
    </div>
  );
}
