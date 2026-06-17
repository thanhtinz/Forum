'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Star, CheckCircle2, Coins, Globe, Languages, ExternalLink, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import type { FreelancerProfile } from '@/lib/jobs';

function FreelancerView() {
  const userId = useSearchParams().get('userId') || '';
  const [p, setP] = useState<FreelancerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    api.get<FreelancerProfile | null>(`/freelancers/${userId}`)
      .then(setP).catch(() => setP(null)).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!p) return <div className="card p-10 text-center text-ink-500">Không tìm thấy hồ sơ freelancer.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar user={p.user} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{p.user.displayName || p.user.username}</h1>
            <p className="text-ink-500">{p.headline}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              <span className="flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" /> {(p.ratingAvg ?? 0).toFixed(1)} ({p.ratingCount ?? 0})</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={14} /> {p.jobsDone} việc xong</span>
              {p.hourlyRate != null && <span className="flex items-center gap-1"><Coins size={14} /> {p.hourlyRate.toLocaleString()} gem/giờ</span>}
              {p.earned != null && <span className="flex items-center gap-1"><Coins size={14} /> kiếm được {p.earned.toLocaleString()} gem</span>}
              {p.country && <span className="flex items-center gap-1"><Globe size={14} /> {p.country}</span>}
              {p.available && <span className="chip bg-emerald-100 text-emerald-700">Đang nhận việc</span>}
            </div>
          </div>
          <Link href={`/chat?to=${p.user.id}`} className="btn-outline inline-flex items-center gap-1 text-sm"><MessageCircle size={15} /> Nhắn tin</Link>
        </div>
      </div>

      {p.bio && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Giới thiệu</h2>
          <p className="whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{p.bio}</p>
        </div>
      )}

      {p.skills?.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Kỹ năng</h2>
          <div className="flex flex-wrap gap-1.5">
            {p.skills.map((s) => <span key={s} className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{s}</span>)}
          </div>
        </div>
      )}

      {p.languages?.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><Languages size={18} /> Ngôn ngữ</h2>
          <div className="flex flex-wrap gap-1.5">
            {p.languages.map((l) => <span key={l} className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{l}</span>)}
          </div>
        </div>
      )}

      {p.portfolio?.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Portfolio</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {p.portfolio.map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-ink-200 hover:shadow-card dark:border-ink-800">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.title} className="h-36 w-full object-cover" />
                )}
                <div className="flex items-center justify-between gap-2 p-3 text-sm font-medium">
                  <span className="truncate">{item.title}</span>
                  <ExternalLink size={14} className="shrink-0 text-ink-400" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {p.experience && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Kinh nghiệm</h2>
          <p className="whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{p.experience}</p>
        </div>
      )}

      {p.certifications?.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Chứng chỉ</h2>
          <ul className="list-inside list-disc text-sm text-ink-600 dark:text-ink-300">
            {p.certifications.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function FreelancerPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <FreelancerView />
    </Suspense>
  );
}
