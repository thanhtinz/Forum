'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { BookOpen, ChevronLeft, ShieldCheck } from 'lucide-react';
import { fetcher } from '@/lib/api';

export default function ScamGuidePage() {
  const { data } = useSWR<{ title: string; body: string }[]>('/scam/guide', fetcher);
  return (
    <div className="container-forum max-w-3xl space-y-4 py-5">
      <Link href="/scam" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Tố cáo lừa đảo</Link>
      <h1 className="flex items-center gap-2 text-xl font-bold"><BookOpen className="text-brand-600" /> Cẩm nang chống lừa đảo</h1>
      <div className="space-y-3">
        {data?.map((g, i) => (
          <div key={i} className="card p-4">
            <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={16} className="text-emerald-600" /> {g.title}</h2>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{g.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
