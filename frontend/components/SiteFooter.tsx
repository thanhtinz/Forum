'use client';

import { useSiteConfig } from '@/lib/siteConfig';

export function SiteFooter() {
  const cfg = useSiteConfig();
  const text = (cfg.footerText || '').replace('{year}', String(new Date().getFullYear()));
  return (
    <footer className="border-t border-ink-200/70 py-8 text-center text-sm text-ink-500 dark:border-ink-800">
      <div className="container-forum whitespace-pre-line">{text}</div>
    </footer>
  );
}
