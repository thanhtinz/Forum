'use client';

import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';

const KEY = 'cookieConsent';

// Thanh xác nhận cookie: hiện khi chưa đồng ý; bấm "Cookies" ở footer sẽ mở lại.
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(KEY) !== 'accepted') setShow(true);
    const open = () => setShow(true);
    window.addEventListener('open-cookie-consent', open);
    return () => window.removeEventListener('open-cookie-consent', open);
  }, []);

  function accept() { localStorage.setItem(KEY, 'accepted'); setShow(false); }
  function close() { setShow(false); }

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-2xl dark:border-ink-700 dark:bg-ink-900 sm:flex-row sm:items-center">
        <Cookie className="hidden shrink-0 text-amber-500 sm:block" size={26} />
        <p className="flex-1 text-sm text-ink-600 dark:text-ink-300">
          Website dùng cookie để duy trì đăng nhập và ghi nhớ tuỳ chọn của bạn. Bằng việc tiếp tục, bạn đồng ý với{' '}
          <a href="/p?slug=cookies" className="text-brand-600 hover:underline">Chính sách Cookie</a>.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={close} className="rounded-lg px-3 py-2 text-sm text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">Để sau</button>
          <button onClick={accept} className="btn-primary !py-2 text-sm">Đồng ý</button>
        </div>
        <button onClick={close} aria-label="Đóng" className="absolute right-2 top-2 text-ink-400 hover:text-ink-600 sm:hidden"><X size={16} /></button>
      </div>
    </div>
  );
}
