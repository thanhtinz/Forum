'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Cookie, Sun, Moon, Rss } from 'lucide-react';
import { useSiteConfig } from '@/lib/siteConfig';

export function SiteFooter() {
  const cfg = useSiteConfig();
  const text = (cfg.footerText || '').replace('{year}', String(new Date().getFullYear()));
  const linkCls = 'text-white/80 transition hover:text-white';

  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  function toggleTheme() {
    const el = document.documentElement;
    el.classList.toggle('dark');
    setDark(el.classList.contains('dark'));
  }

  return (
    <footer className="mt-6 border-t border-black/10 bg-brand-700 text-white dark:bg-ink-900">
      <div className="container-forum py-6">
        {/* Hàng 1: Cookies (mở bảng xác nhận) + đổi giao diện (icon khác nhau theo chế độ) */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <button onClick={() => window.dispatchEvent(new Event('open-cookie-consent'))} className={`flex items-center gap-1.5 ${linkCls}`}>
            <Cookie size={16} /> Cookies
          </button>
          <button onClick={toggleTheme} aria-label={dark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'} title={dark ? 'Giao diện tối' : 'Giao diện sáng'} className={`flex items-center ${linkCls}`}>
            {dark ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>

        {/* Hàng 2: liên kết + RSS */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <a href="/p?slug=noi-quy" className={linkCls}>Nội quy & quy định</a>
          <a href="/p?slug=quyen-rieng-tu" className={linkCls}>Chính sách riêng tư</a>
          <a href="/p?slug=tro-giup" className={linkCls}>Trợ giúp</a>
          <Link href="/" className={linkCls}>Trang chủ</Link>
          <a href="/rss.xml" title="RSS" className="grid h-6 w-6 place-items-center rounded bg-amber-500 text-white hover:bg-amber-600">
            <Rss size={14} />
          </a>
        </div>

        {/* Hàng 3: bản quyền (chỉnh trong Admin → Cấu hình) */}
        {text && <p className="mt-4 whitespace-pre-line text-sm text-white/70">{text}</p>}

        {/* Miễn trừ trách nhiệm + liên hệ */}
        <p className="mt-3 text-xs leading-relaxed text-white/60">
          Nội dung được gửi bởi thành viên. Chúng tôi sẽ không chịu trách nhiệm với các thông tin do thành viên đưa lên trừ thông tin nội bộ.
          {(cfg.contactEmail || cfg.name) && <br />}
          {cfg.contactEmail && <>Liên hệ: <a href={`mailto:${cfg.contactEmail}`} className="hover:text-white hover:underline">{cfg.contactEmail}</a>{cfg.name ? ' | ' : ''}</>}
          {cfg.name && <>{cfg.name}</>}
        </p>
      </div>
    </footer>
  );
}
