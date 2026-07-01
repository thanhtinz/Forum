'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  ShieldAlert, ThumbsUp, Users, Bell, BellOff, MessageSquare, Flag, ChevronLeft,
  ExternalLink, FileText, History, AlertCircle,
} from 'lucide-react';
import { api, fetcher, ApiError } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { CommentBox, CommentContent } from '@/components/CommentBox';
import {
  TARGET_TYPES, REASONS, STATUSES, STATUS_COLOR, RISK, RISK_COLOR, EVIDENCE_KINDS,
  targetLabel, formatMoney,
} from '@/lib/scam';

const TARGET_FIELDS: [string, string][] = [
  ['targetUid', 'UID'], ['targetEmail', 'Email'], ['targetPhone', 'SĐT'], ['targetWallet', 'Ví crypto'],
  ['targetDomain', 'Domain'], ['targetDiscord', 'Discord'], ['targetTelegram', 'Telegram'],
  ['targetFacebook', 'Facebook'], ['targetZalo', 'Zalo'],
];

function ScamDetail() {
  const id = useSearchParams().get('id');
  const { user } = useAuth();
  const { data: c, mutate, isLoading } = useSWR<any>(id ? `/scam/cases/${id}` : null, fetcher);
  const { data: profile } = useSWR<any>(c?.reportedUserId ? `/scam/scammer?userId=${c.reportedUserId}` : null, fetcher);

  const [appealText, setAppealText] = useState('');
  const [showAppeal, setShowAppeal] = useState(false);
  const [err, setErr] = useState('');

  if (isLoading) return <div className="container-forum py-10 text-center text-ink-500">Đang tải…</div>;
  if (!c) return <div className="container-forum py-10 text-center text-ink-500">Không tìm thấy báo cáo.</div>;

  async function act(fn: () => Promise<any>) {
    setErr('');
    try { await fn(); mutate(); } catch (e) { setErr(e instanceof ApiError ? e.message : 'Lỗi'); }
  }
  const needLogin = () => { if (!user) { setErr('Đăng nhập để thực hiện'); return true; } return false; };

  async function sendComment(content: string) {
    if (needLogin()) return;
    await act(() => api.post(`/scam/cases/${id}/comment`, { body: content.trim() }));
  }
  async function sendAppeal() {
    if (needLogin() || appealText.trim().length < 10) { setErr('Lý do khiếu nại tối thiểu 10 ký tự'); return; }
    await act(() => api.post(`/scam/cases/${id}/appeal`, { reason: appealText.trim() }));
    setAppealText(''); setShowAppeal(false);
  }
  const voted = (k: string) => c.myVotes?.includes(k);

  return (
    <div className="container-forum max-w-4xl space-y-4 py-5">
      <Link href="/scam" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Danh sách tố cáo</Link>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${STATUS_COLOR[c.status]}`}>{STATUSES[c.status]}</span>
          <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{TARGET_TYPES[c.targetType]}</span>
          <span className="chip bg-rose-50 text-rose-600 dark:bg-rose-900/30">{REASONS[c.reason]}</span>
          {c.riskLevel && <span className={`chip ${RISK_COLOR[c.riskLevel]}`}>Rủi ro: {RISK[c.riskLevel]}</span>}
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold"><ShieldAlert className="shrink-0 text-rose-600" /> {c.title}</h1>
        <p className="mt-1 text-sm text-ink-500">
          Tố cáo bởi <b>{c.reporter?.displayName || c.reporter?.username}</b> · {new Date(c.createdAt).toLocaleString('vi-VN')}
          {c.damageValue ? <> · Thiệt hại ~ <b className="text-rose-600">{formatMoney(c.damageValue)}</b></> : null}
          {c.incidentDate ? <> · Xảy ra {new Date(c.incidentDate).toLocaleDateString('vi-VN')}</> : null}
        </p>
        {c.modNote && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-700 dark:bg-amber-900/30">Ghi chú kiểm duyệt: {c.modNote}</p>}
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Đối tượng bị tố cáo</h2>
        <p className="text-lg font-bold">{targetLabel(c)}</p>
        {c.reportedUser && <Link href={`/profile?u=${c.reportedUser.username}`} className="text-sm text-brand-600 hover:underline">@{c.reportedUser.username} →</Link>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TARGET_FIELDS.map(([k, label]) => c[k] ? (
            <div key={k} className="flex justify-between rounded-lg bg-ink-50 px-3 py-1.5 text-sm dark:bg-ink-800/50">
              <span className="text-ink-500">{label}</span><span className="font-medium">{c[k]}</span>
            </div>
          ) : null)}
          {c.orderRef && <div className="flex justify-between rounded-lg bg-ink-50 px-3 py-1.5 text-sm dark:bg-ink-800/50"><span className="text-ink-500">Mã đơn</span><span className="font-medium">{c.orderRef}</span></div>}
        </div>
      </div>

      {profile && (
        <div className="card border-rose-200 p-5 dark:border-rose-900/40">
          <h2 className="mb-2 flex items-center gap-1 font-semibold text-rose-600"><AlertCircle size={16} /> Hồ sơ rủi ro</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini label="Số lần bị tố" value={profile.reportCount} />
            <Mini label="Đã xác nhận" value={profile.confirmedCount} />
            <Mini label="Nạn nhân" value={profile.victimCount} />
            <Mini label="Thiệt hại" value={formatMoney(profile.totalDamage)} />
          </div>
          <div className="mt-2"><span className={`chip ${RISK_COLOR[profile.riskLevel]}`}>Mức rủi ro: {RISK[profile.riskLevel]}</span></div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Mô tả chi tiết</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.description}</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Bằng chứng ({c.evidence?.length || 0})</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {c.evidence?.map((e: any) => (
            <div key={e.id} className="rounded-lg border border-ink-200 p-2 text-sm dark:border-ink-800">
              <div className="mb-1 flex items-center gap-1 font-medium"><FileText size={14} /> {EVIDENCE_KINDS[e.kind]}</div>
              {e.url && (/\.(png|jpe?g|gif|webp)$/i.test(e.url)
                ? <a href={e.url} target="_blank" rel="noreferrer"><img src={e.url} alt="" className="max-h-48 rounded object-contain" /></a>
                : <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline"><ExternalLink size={13} /> Mở liên kết</a>)}
              {e.label && <p className="mt-1 break-words text-ink-500">{e.label}</p>}
            </div>
          ))}
          {!c.evidence?.length && <p className="text-sm text-ink-500">Không có bằng chứng.</p>}
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-4">
        <button className={`btn ${voted('ME_TOO') ? 'btn-primary' : 'btn-outline'}`} onClick={() => act(() => api.post(`/scam/cases/${id}/vote`, { kind: 'ME_TOO' }))}><Users size={15} /> Tôi cũng bị ({c.meTooCount})</button>
        <button className={`btn ${voted('HELPFUL') ? 'btn-primary' : 'btn-outline'}`} onClick={() => act(() => api.post(`/scam/cases/${id}/vote`, { kind: 'HELPFUL' }))}><ThumbsUp size={15} /> Hữu ích ({c.helpfulCount})</button>
        <button className={`btn ${c.following ? 'btn-primary' : 'btn-outline'}`} onClick={() => act(() => api.post(`/scam/cases/${id}/follow`, {}))}>{c.following ? <><BellOff size={15} /> Bỏ theo dõi</> : <><Bell size={15} /> Theo dõi</>}</button>
        <button className="btn-outline" onClick={() => setShowAppeal((s) => !s)}><Flag size={15} /> Khiếu nại báo cáo sai</button>
        {c.isOwner && <Link href={`/scam/edit?id=${id}`} className="btn-ghost ml-auto">Sửa báo cáo</Link>}
      </div>

      {showAppeal && (
        <div className="card space-y-2 p-4">
          <p className="text-sm font-medium">Gửi khiếu nại (dành cho bên bị tố cáo hoặc khi báo cáo sai sự thật)</p>
          <textarea className="input min-h-[80px]" placeholder="Trình bày lý do…" value={appealText} onChange={(e) => setAppealText(e.target.value)} />
          <button className="btn-primary" onClick={sendAppeal}>Gửi khiếu nại</button>
        </div>
      )}

      {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-600 dark:bg-rose-900/30">{err}</p>}

      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-1 font-semibold"><MessageSquare size={16} /> Bình luận ({c.commentCount})</h2>
        {c.canDefend && <p className="mb-2 rounded-lg bg-sky-50 p-2 text-xs text-sky-700 dark:bg-sky-900/30">Bạn là bên bị tố cáo — bình luận của bạn sẽ được đánh dấu là “phản hồi”.</p>}
        <div className="space-y-3">
          {c.comments?.map((cm: any) => (
            <div key={cm.id} className="flex gap-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-ink-200 text-center text-sm leading-8">
                {cm.author?.avatar ? <img src={cm.author.avatar} alt="" className="h-full w-full object-cover" /> : (cm.author?.username?.[0] || '?').toUpperCase()}
              </div>
              <div className={`flex-1 rounded-lg p-2 text-sm ${cm.isDefense ? 'bg-sky-50 dark:bg-sky-900/20' : 'bg-ink-50 dark:bg-ink-800/50'}`}>
                <div className="flex items-center gap-2">
                  <b>{cm.author?.displayName || cm.author?.username}</b>
                  {cm.isDefense && <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-900/40">Phản hồi từ bên bị tố</span>}
                  {['ADMIN', 'MODERATOR'].includes(cm.author?.role) && <span className="chip bg-brand-100 text-brand-700 dark:bg-brand-900/40">BQT</span>}
                  <span className="text-xs text-ink-400">{new Date(cm.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <CommentContent text={cm.body} />
              </div>
            </div>
          ))}
          {!c.comments?.length && <p className="text-sm text-ink-500">Chưa có bình luận.</p>}
        </div>
        <div className="mt-3">
          {user
            ? <CommentBox user={user} onSubmit={sendComment} />
            : <p className="text-sm text-ink-500"><a href="/login" className="text-brand-600 hover:underline">Đăng nhập</a> để bình luận.</p>}
        </div>
      </div>

      {c.editLogs?.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 flex items-center gap-1 font-semibold text-ink-500"><History size={15} /> Nhật ký xử lý</h2>
          <ul className="space-y-1 text-xs text-ink-500">
            {c.editLogs.map((l: any) => <li key={l.id}>• {new Date(l.createdAt).toLocaleString('vi-VN')} — {l.summary} <span className="text-ink-400">({l.editor?.username})</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-ink-50 p-2 text-center dark:bg-ink-800/50"><div className="font-bold">{value}</div><div className="text-xs text-ink-500">{label}</div></div>;
}

export default function ScamDetailPage() {
  return <Suspense fallback={<div className="container-forum py-10 text-center text-ink-500">Đang tải…</div>}><ScamDetail /></Suspense>;
}
