'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { TOOL_REGISTRY } from '@/lib/tools';

function ToolRunner() {
  const slug = useSearchParams().get('slug') || '';
  const [tool, setTool] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!slug) return;
    api.get<any>(`/tools/${slug}`).then(setTool).catch((e) => setErr(e.message));
    api.post(`/tools/${slug}/use`).catch(() => {});
  }, [slug]);

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!tool) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const Comp = TOOL_REGISTRY[tool.component];

  return (
    <div className="space-y-4">
      <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Tất cả công cụ</Link>
      <div className="card p-5">
        <h1 className="text-xl font-bold">{tool.name}</h1>
        <p className="text-sm text-ink-500">{tool.description}</p>
        <div className="mt-4">
          {Comp ? <Comp /> : <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-500 dark:bg-ink-900">Công cụ này đang được hoàn thiện (component: {tool.component}).</p>}
        </div>
      </div>
    </div>
  );
}

export default function ToolPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><ToolRunner /></Suspense>;
}
