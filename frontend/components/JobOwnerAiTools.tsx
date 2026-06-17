'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Star, Users2, Gauge } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';

interface SuggestedFreelancer {
  userId: string;
  headline?: string | null;
  skills: string[];
  ratingAvg: number;
  ratingCount: number;
  jobsDone: number;
  matchScore: number;
  matchedSkills: string[];
  user: { id: string; username: string; displayName?: string | null; avatar?: string | null };
}

interface ScoredCandidate {
  proposalId: string;
  bidAmount: number;
  days: number;
  score: number;
  reason: string;
  freelancer?: { id: string; username: string; displayName?: string | null; avatar?: string | null };
}

// Bộ công cụ AI cho chủ job: gợi ý freelancer phù hợp + chấm điểm ứng viên.
export default function JobOwnerAiTools({ jobId }: { jobId: string }) {
  const [suggested, setSuggested] = useState<SuggestedFreelancer[] | null>(null);
  const [scored, setScored] = useState<ScoredCandidate[] | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  async function loadSuggest() {
    setErr(''); setBusy('suggest');
    try { setSuggested(await api.get<SuggestedFreelancer[]>(`/jobs/${jobId}/ai/suggest-freelancers`)); }
    catch (e: any) { setErr(e.message || 'Lỗi'); }
    finally { setBusy(''); }
  }
  async function loadScore() {
    setErr(''); setBusy('score');
    try { setScored(await api.get<ScoredCandidate[]>(`/jobs/${jobId}/ai/score-candidates`)); }
    catch (e: any) { setErr(e.message || 'Lỗi'); }
    finally { setBusy(''); }
  }

  return (
    <div className="card space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Sparkles size={18} className="text-brand-600" /> Trợ lý AI tuyển dụng</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={loadSuggest} disabled={!!busy} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm disabled:opacity-50">
          <Users2 size={15} /> {busy === 'suggest' ? 'Đang tìm…' : 'Gợi ý freelancer phù hợp'}
        </button>
        <button onClick={loadScore} disabled={!!busy} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm disabled:opacity-50">
          <Gauge size={15} /> {busy === 'score' ? 'Đang chấm…' : 'AI chấm điểm ứng viên'}
        </button>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}

      {suggested && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Freelancer phù hợp ({suggested.length})</h3>
          {suggested.length === 0 && <p className="text-sm text-ink-500">Chưa tìm thấy freelancer phù hợp.</p>}
          {suggested.map((f) => (
            <div key={f.userId} className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 p-3 dark:border-ink-800">
              <Avatar user={f.user} size={36} />
              <div className="min-w-0 flex-1">
                <Link href={`/freelancer?userId=${f.userId}`} className="text-sm font-semibold hover:text-brand-600">{f.user.displayName || f.user.username}</Link>
                <div className="truncate text-xs text-ink-500">{f.headline || '—'}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                  <span className="flex items-center gap-0.5"><Star size={11} className="fill-amber-400 text-amber-400" /> {f.ratingAvg.toFixed(1)} ({f.ratingCount})</span>
                  <span>{f.jobsDone} job</span>
                  {f.matchedSkills.length > 0 && <span className="text-emerald-600">khớp: {f.matchedSkills.join(', ')}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-brand-600">{f.matchScore}%</div>
                <div className="text-[10px] text-ink-400">độ phù hợp</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {scored && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Điểm ứng viên ({scored.length})</h3>
          {scored.length === 0 && <p className="text-sm text-ink-500">Chưa có đề xuất nào để chấm.</p>}
          {scored.map((c) => (
            <div key={c.proposalId} className="rounded-lg border border-ink-200 p-3 dark:border-ink-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {c.freelancer && <Avatar user={c.freelancer} size={28} />}
                  <span className="text-sm font-semibold">{c.freelancer?.displayName || c.freelancer?.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-500">{c.bidAmount?.toLocaleString()} gem · {c.days} ngày</span>
                  <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${c.score >= 70 ? 'bg-emerald-100 text-emerald-700' : c.score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>{c.score}</span>
                </div>
              </div>
              {c.reason && <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-300">{c.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
