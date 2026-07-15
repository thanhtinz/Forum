'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSiteConfig } from '@/lib/siteConfig';
import { useAuth } from './AuthProvider';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Không tải được Google Sign-In'));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// Nút "Đăng nhập bằng Google" dùng Google Identity Services (One Tap JS SDK) —
// chỉ hiện khi admin đã bật + cấu hình Client ID (site-config). ID token trả về
// được backend tự xác thực chữ ký với Google, không tin dữ liệu từ client.
export function GoogleSignInButton() {
  const cfg = useSiteConfig();
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!cfg.googleLoginEnabled || !cfg.googleClientId || !ref.current) return;
    let cancelled = false;
    loadGsiScript().then(() => {
      if (cancelled || !window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: async (r) => {
          try {
            await loginWithGoogle(r.credential);
            router.push('/');
          } catch (e: any) { setErr(e.message || 'Đăng nhập Google thất bại'); }
        },
      });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with', locale: 'vi' });
    }).catch(() => setErr('Không tải được Google Sign-In'));
    return () => { cancelled = true; };
  }, [cfg.googleLoginEnabled, cfg.googleClientId]);

  if (!cfg.googleLoginEnabled || !cfg.googleClientId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-ink-400">
        <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" /> hoặc <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
      </div>
      <div ref={ref} className="flex justify-center" />
      {err && <p className="text-center text-xs text-red-500">{err}</p>}
    </div>
  );
}
