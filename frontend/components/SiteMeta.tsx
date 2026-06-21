'use client';

import { useEffect } from 'react';
import { useSiteConfig } from '@/lib/siteConfig';

// Cập nhật <title> + meta SEO theo cấu hình site (admin đặt) — vì frontend là static export
// nên không thể set ở server; set phía client để tab trình duyệt & Googlebot (có chạy JS) nhận đúng.
function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

export function SiteMeta() {
  const cfg = useSiteConfig();
  useEffect(() => {
    if (!cfg?.name) return;
    const title = cfg.tagline ? `${cfg.name} — ${cfg.tagline}` : cfg.name;
    const desc = cfg.description || cfg.tagline || '';
    document.title = title;
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'application-name', cfg.name);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:site_name', cfg.name);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', desc);
    if (cfg.favicon) {
      let link = document.head.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = cfg.favicon;
    }
  }, [cfg]);
  return null;
}
