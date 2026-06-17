'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Briefcase, Clock, Users2, Bookmark, BookmarkCheck, Star, Send, Paperclip,
  ShieldCheck, AlertTriangle, CheckCircle2, RotateCcw, Upload, Gavel, Tags,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import {
  catLabel, formatBudget, statusLabel, BUDGET_TYPE_LABELS, PROPOSAL_STATUS_LABELS,
  type Job, type Proposal,
} from '@/lib/jobs';

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}>
          <Star size={18} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-ink-300'} />
        </button>
      ))}
    </div>
  );
}

function JobView() {
  const id = useSearchParams().get('id') || '';
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [bookmarked, setBookmarked] = useState(false);

  // proposal form (freelancer)
  const [coverLetter, setCoverLetter] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [days, setDays] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // owner proposals
  const [proposals, setProposals] = useState<Proposal[]>([]);

  // work submit / revision / dispute
  const [workNote, setWorkNote] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDispute, setShowDispute] = useState(false);

  // review
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const j = await api.get<Job>(`/jobs/${id}`);
      setJob(j);
      if (j.isOwner) api.get<Proposal[]>(`/jobs/${id}/proposals`).then(setProposals).catch(() => {});
      if (user) api.get<{ bookmarked: boolean }>(`/jobs/${id}/bookmark`).then((b) => setBookmarked(b.bookmarked)).catch(() => {});
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id, user]);

  async function act(fn: () => Promise<unknown>, ok = 'Thành công') {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); await load(); }
    catch (e: any) { setErr(e.message || 'Có lỗi xảy ra'); }
  }

  async function toggleBookmark() {
    if (!job) return;
    try { const r = await api.post<{ bookmarked: boolean }>(`/jobs/${job.id}/bookmark`, {}); setBookmarked(r.bookmarked); } catch {}
  }

  async function submitProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;
    await act(() => api.post(`/jobs/${job.id}/proposals`, {
      coverLetter,
      bidAmount: Number(bidAmount),
      days: Number(days),
      portfolioUrl: portfolioUrl.trim() || undefined,
    }), 'Đã gửi đề xuất');
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (err && !job) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!job) return null;

  const isFreelancer = user && !job.isOwner;
  const isHired = !!user && job.hiredFreelancerId === user.id;
  const canPropose = isFreelancer && job.status === 'OPEN' && !job.myProposal;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-brand-100 text-brand-700"><Tags size={12} className="mr-1 inline" />{catLabel(job.category)}</span>
          <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{statusLabel(job.status)}</span>
          {user && (
            <button onClick={toggleBookmark} className={`ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${bookmarked ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
              {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} {bookmarked ? 'Đã lưu' : 'Lưu'}
            </button>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold">{job.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
          <span className="flex items-center gap-1"><Avatar user={job.employer} size={20} /> {job.employer.displayName || job.employer.username}</span>
          <span className="flex items-center gap-1"><Users2 size={14} /> {job.proposalCount} ứng tuyển</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {(() => { try { return formatDistanceToNow(new Date(job.createdAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}</span>
          {job.country && <span>{job.country}</span>}
          {job.language && <span>{job.language}</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div>
            <div className="text-lg font-semibold text-emerald-600">{formatBudget(job)}</div>
            <div className="text-xs text-ink-500">{BUDGET_TYPE_LABELS[job.budgetType] || job.budgetType}{job.deadline ? ` · hạn ${new Date(job.deadline).toLocaleDateString('vi-VN')}` : ''}</div>
          </div>
          {job.escrow && (
            <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <ShieldCheck size={15} /> Ký quỹ {job.escrow.amount?.toLocaleString()} gem · {job.escrow.status}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Mô tả công việc</h2>
        <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: job.description }} />
        {(job.skills?.length ?? 0) > 0 && (
          <div className="mt-4">
            <h3 className="mb-1.5 text-sm font-semibold">Kỹ năng yêu cầu</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.skills!.map((s) => <span key={s} className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{s}</span>)}
            </div>
          </div>
        )}
        {(job.attachments?.length ?? 0) > 0 && (
          <div className="mt-4">
            <h3 className="mb-1.5 text-sm font-semibold">Tệp đính kèm</h3>
            <ul className="space-y-1">
              {job.attachments!.map((a, i) => (
                <li key={i}><a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-brand-600"><Paperclip size={14} /> {a.name}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {msg && <div className="card border-emerald-300 p-3 text-sm text-emerald-600">{msg}</div>}
      {err && <div className="card border-red-300 p-3 text-sm text-red-500">{err}</div>}

      {/* Freelancer: đã có đề xuất */}
      {isFreelancer && job.myProposal && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Đề xuất của bạn</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="chip bg-brand-100 text-brand-700">{PROPOSAL_STATUS_LABELS[job.myProposal.status] || job.myProposal.status}</span>
            <span>{job.myProposal.bidAmount?.toLocaleString()} gem</span>
            <span>{job.myProposal.days} ngày</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{job.myProposal.coverLetter}</p>
          {job.myProposal.status === 'PENDING' && (
            <button onClick={() => act(() => api.post(`/jobs/proposals/${job.myProposal!.id}/withdraw`, {}), 'Đã rút đề xuất')} className="btn-outline mt-3 text-sm">Rút đề xuất</button>
          )}
        </div>
      )}

      {/* Freelancer: gửi đề xuất */}
      {canPropose && (
        <form onSubmit={submitProposal} className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Send size={18} /> Gửi đề xuất</h2>
          <textarea className="input min-h-[120px] w-full" placeholder="Thư giới thiệu — vì sao bạn phù hợp?" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} required />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input className="input" type="number" placeholder="Giá đề xuất (gem)" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} required />
            <input className="input" type="number" placeholder="Số ngày hoàn thành" value={days} onChange={(e) => setDays(e.target.value)} required />
            <input className="input" placeholder="Link portfolio (tuỳ chọn)" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
          </div>
          <div className="flex justify-end"><button type="submit" className="btn-primary">Gửi đề xuất</button></div>
        </form>
      )}

      {!user && job.status === 'OPEN' && (
        <div className="card p-5 text-center text-sm text-ink-500">Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a> để gửi đề xuất.</div>
      )}

      {/* Chủ job: danh sách ứng tuyển */}
      {job.isOwner && (
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Đề xuất ứng tuyển ({proposals.length})</h2>
          {proposals.length === 0 && <p className="text-sm text-ink-500">Chưa có đề xuất nào.</p>}
          <div className="space-y-3">
            {proposals.map((p) => (
              <div key={p.id} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {p.freelancer && <Avatar user={p.freelancer} size={32} />}
                    <div>
                      <Link href={p.freelancer ? `/freelancer?userId=${p.freelancer.id}` : '#'} className="text-sm font-semibold hover:text-brand-600">
                        {p.freelancer?.displayName || p.freelancer?.username}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-ink-500">
                        <Star size={12} className="fill-amber-400 text-amber-400" /> {(p.freelancer?.ratingAvg ?? 0).toFixed(1)} ({p.freelancer?.ratingCount ?? 0})
                      </div>
                    </div>
                  </div>
                  <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{PROPOSAL_STATUS_LABELS[p.status] || p.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-ink-500">
                  <span className="font-medium text-emerald-600">{p.bidAmount?.toLocaleString()} gem</span>
                  <span>{p.days} ngày</span>
                  {p.portfolioUrl && <a href={p.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600">Portfolio</a>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{p.coverLetter}</p>
                {p.status === 'PENDING' && job.status === 'OPEN' && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => act(() => api.post(`/jobs/proposals/${p.id}/hire`, {}), 'Đã chọn freelancer')} className="btn-primary !py-1.5 text-sm">Chọn (thuê)</button>
                    <button onClick={() => act(() => api.post(`/jobs/proposals/${p.id}/reject`, {}), 'Đã từ chối')} className="btn-outline !py-1.5 text-sm">Từ chối</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chủ job: quản lý công việc đang thực hiện */}
      {job.isOwner && (job.status === 'IN_PROGRESS' || job.status === 'SUBMITTED') && (
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">Quản lý công việc</h2>
          <div className="flex flex-wrap gap-2">
            {job.status === 'SUBMITTED' && (
              <button onClick={() => act(() => api.post(`/jobs/${job.id}/approve`, {}), 'Đã duyệt & giải ngân')} className="btn-primary inline-flex items-center gap-1 !py-1.5 text-sm"><CheckCircle2 size={15} /> Duyệt & giải ngân</button>
            )}
            <button onClick={() => act(() => api.post(`/jobs/${job.id}/request-revision`, { note: workNote || undefined }), 'Đã yêu cầu sửa')} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm"><RotateCcw size={15} /> Yêu cầu sửa</button>
            <button onClick={() => setShowDispute((s) => !s)} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm"><Gavel size={15} /> Mở tranh chấp</button>
          </div>
          <textarea className="input w-full" placeholder="Ghi chú yêu cầu sửa (tuỳ chọn)" value={workNote} onChange={(e) => setWorkNote(e.target.value)} />
          {showDispute && (
            <div className="space-y-2 rounded-lg border border-amber-300 p-3">
              <textarea className="input w-full" placeholder="Lý do tranh chấp" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
              <button onClick={() => act(() => api.post(`/jobs/${job.id}/dispute`, { reason: disputeReason }), 'Đã mở tranh chấp')} disabled={!disputeReason.trim()} className="btn-primary !py-1.5 text-sm disabled:opacity-50">Gửi tranh chấp</button>
            </div>
          )}
        </div>
      )}

      {/* Freelancer được thuê: nộp sản phẩm */}
      {isHired && job.status === 'IN_PROGRESS' && (
        <div className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Upload size={18} /> Nộp sản phẩm</h2>
          <textarea className="input min-h-[100px] w-full" placeholder="Ghi chú bàn giao, link kết quả…" value={workNote} onChange={(e) => setWorkNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => act(() => api.post(`/jobs/${job.id}/submit-work`, { note: workNote }), 'Đã nộp sản phẩm')} className="btn-primary !py-1.5 text-sm">Nộp sản phẩm</button>
            <button onClick={() => setShowDispute((s) => !s)} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm"><Gavel size={15} /> Mở tranh chấp</button>
          </div>
          {showDispute && (
            <div className="space-y-2 rounded-lg border border-amber-300 p-3">
              <textarea className="input w-full" placeholder="Lý do tranh chấp" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
              <button onClick={() => act(() => api.post(`/jobs/${job.id}/dispute`, { reason: disputeReason }), 'Đã mở tranh chấp')} disabled={!disputeReason.trim()} className="btn-primary !py-1.5 text-sm disabled:opacity-50">Gửi tranh chấp</button>
            </div>
          )}
        </div>
      )}

      {job.status === 'DISPUTED' && (
        <div className="card border-amber-300 p-4 text-sm text-amber-600"><AlertTriangle size={16} className="mr-1 inline" /> Công việc đang trong quá trình tranh chấp, chờ quản trị viên xử lý.</div>
      )}

      {/* Đánh giá khi hoàn thành (cho cả hai bên) */}
      {job.status === 'COMPLETED' && (job.isOwner || isHired) && (
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">Đánh giá</h2>
          <Stars value={rating} onChange={setRating} />
          <textarea className="input min-h-[80px] w-full" placeholder="Nhận xét của bạn…" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
          <div className="flex justify-end">
            <button onClick={() => act(() => api.post(`/jobs/${job.id}/review`, { rating, comment: reviewComment }), 'Đã gửi đánh giá')} className="btn-primary !py-1.5 text-sm">Gửi đánh giá</button>
          </div>
        </div>
      )}

      {job.isOwner && job.status === 'OPEN' && (
        <div className="flex justify-end">
          <button onClick={() => act(() => api.post(`/jobs/${job.id}/cancel`, {}), 'Đã huỷ việc')} className="btn-outline text-sm text-red-500">Huỷ việc</button>
        </div>
      )}
    </div>
  );
}

export default function JobPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <JobView />
    </Suspense>
  );
}
