'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Star, Play, Copy, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { TOOL_REGISTRY } from '@/lib/tools';

// Runner chung cho tool chạy ở server (pure/AI)
function ServerToolRunner({ slug }: { slug: string }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  async function run() {
    setErr(''); setBusy(true); setOutput('');
    try {
      const r = await api.post<{ output: string }>(`/tools/run/${slug}`, { input });
      setOutput(r.output);
    } catch (e: any) { setErr(e.message || 'Lỗi'); }
    finally { setBusy(false); }
  }
  function copy() { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1200); }

  return (
    <div className="space-y-3">
      <textarea className="input min-h-[120px] font-mono text-sm" placeholder="Nhập dữ liệu / mô tả…" value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={run} disabled={busy} className="btn-primary">
        {busy ? <><Loader2 size={15} className="animate-spin" /> Đang chạy…</> : <><Play size={15} /> Chạy</>}
      </button>
      {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-600 dark:bg-rose-900/30">{err}</p>}
      {output && (
        <div className="relative">
          <button onClick={copy} className="absolute right-2 top-2 rounded-md bg-ink-100 p-1.5 text-ink-500 hover:text-brand-600 dark:bg-ink-800">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-ink-50 p-3 pr-10 text-sm dark:bg-ink-900">{output}</pre>
        </div>
      )}
    </div>
  );
}

function ToolRunner() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const [tool, setTool] = useState<any>(null);
  const [err, setErr] = useState('');
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get<any>(`/tools/${slug}`).then(setTool).catch((e) => setErr(e.message));
    api.post(`/tools/${slug}/use`).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!slug || !user) return;
    api.get<{ favorited: boolean }>(`/tools/${slug}/favorite`).then((r) => setFav(r.favorited)).catch(() => {});
  }, [slug, user]);

  async function toggleFav() {
    if (!user) { setErr('Đăng nhập để lưu yêu thích'); return; }
    const r = await api.post<{ favorited: boolean }>(`/tools/${slug}/favorite`);
    setFav(r.favorited);
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!tool) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const isServer = !!tool.serverEngine;
  const Comp = TOOL_REGISTRY[tool.component];

  return (
    <div className="space-y-4">
      <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Tất cả công cụ</Link>
      <div className="card p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">{tool.name}{isServer && <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-900/40">{tool.serverEngine?.startsWith('ai-') ? 'AI' : 'Server'}</span>}</h1>
            <p className="text-sm text-ink-500">{tool.description}</p>
          </div>
          <button onClick={toggleFav} className={`shrink-0 rounded-lg p-2 ${fav ? 'text-amber-500' : 'text-ink-400 hover:text-amber-500'}`} title="Yêu thích">
            <Star size={20} className={fav ? 'fill-amber-400' : ''} />
          </button>
        </div>
        <div className="mt-4">
          {isServer
            ? <ServerToolRunner slug={slug} />
            : Comp ? <Comp /> : <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-500 dark:bg-ink-900">Công cụ này đang được hoàn thiện (component: {tool.component}).</p>}
        </div>
      </div>
    </div>
  );
}

export default function ToolPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><ToolRunner /></Suspense>;
}
