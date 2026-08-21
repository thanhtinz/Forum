'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

export function InviteLink({ code }: { code: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const link = origin ? `${origin}/register?ref=${code}` : `…/register?ref=${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 dark:border-ink-700 dark:bg-ink-800/50">
          <Share2 size={15} className="shrink-0 text-brand-500" />
          <span className="truncate text-sm text-ink-700 dark:text-ink-200">{link}</span>
        </div>
        <button type="button" onClick={copy}
          className="btn-primary shrink-0 !px-3 !py-2.5">
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Đã chép' : 'Sao chép'}
        </button>
      </div>
      <p className="text-xs text-ink-400">Mã giới thiệu của bạn: <b className="font-mono text-brand-600">{code}</b></p>
    </div>
  );
}
