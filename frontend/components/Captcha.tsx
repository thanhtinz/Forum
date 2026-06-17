'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Provider = 'turnstile' | 'hcaptcha' | 'recaptcha';
interface PublicCfg { enabled: boolean; provider: Provider; siteKey: string }

const SCRIPT: Record<Provider, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
  hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit',
  recaptcha: 'https://www.google.com/recaptcha/api.js?render=explicit',
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true; s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

// Hiển thị widget CAPTCHA nếu admin bật; gọi onToken khi người dùng vượt qua.
// onConfig báo cho cha biết captcha có bật hay không (để bắt buộc/không).
export function Captcha({ onToken, onConfig }: { onToken: (t: string) => void; onConfig?: (enabled: boolean) => void }) {
  const [cfg, setCfg] = useState<PublicCfg | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    api.get<PublicCfg>('/security/captcha').then((c) => { setCfg(c); onConfig?.(c.enabled); }).catch(() => onConfig?.(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cfg?.enabled || !cfg.siteKey || rendered.current) return;
    let cancelled = false;
    (async () => {
      await loadScript(SCRIPT[cfg.provider]);
      // chờ API sẵn sàng
      const api2: any = (window as any);
      const wait = (cond: () => boolean) => new Promise<void>((res) => {
        const t = setInterval(() => { if (cond()) { clearInterval(t); res(); } }, 100);
        setTimeout(() => { clearInterval(t); res(); }, 8000);
      });
      if (cfg.provider === 'turnstile') {
        await wait(() => !!api2.turnstile?.render);
        if (cancelled || !ref.current || rendered.current) return;
        rendered.current = true;
        api2.turnstile.render(ref.current, { sitekey: cfg.siteKey, callback: (tok: string) => onToken(tok) });
      } else if (cfg.provider === 'hcaptcha') {
        await wait(() => !!api2.hcaptcha?.render);
        if (cancelled || !ref.current || rendered.current) return;
        rendered.current = true;
        api2.hcaptcha.render(ref.current, { sitekey: cfg.siteKey, callback: (tok: string) => onToken(tok) });
      } else {
        await wait(() => !!api2.grecaptcha?.render);
        if (cancelled || !ref.current || rendered.current) return;
        rendered.current = true;
        api2.grecaptcha.render(ref.current, { sitekey: cfg.siteKey, callback: (tok: string) => onToken(tok) });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);

  if (!cfg?.enabled) return null;
  return <div ref={ref} className="my-1" />;
}

export default Captcha;
