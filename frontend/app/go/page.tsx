'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ExternalLink, ArrowLeft, Globe } from 'lucide-react';

function RedirectInner() {
  const params = useSearchParams();
  const raw = params.get('url') || '';
  const [seconds, setSeconds] = useState(5);
  const [cancelled, setCancelled] = useState(false);

  // Chỉ chấp nhận http/https; chặn javascript:, data:… cho an toàn
  let target = '';
  let host = '';
  let valid = false;
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      target = u.href;
      host = u.host;
      valid = true;
    }
  } catch { /* invalid url */ }

  useEffect(() => {
    if (!valid || cancelled) return;
    if (seconds <= 0) { window.location.href = target; return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, cancelled, valid, target]);

  if (!valid) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 text-rose-500" size={40} />
          <h1 className="text-lg font-bold">Liên kết không hợp lệ</h1>
          <p className="mt-1 text-sm text-ink-500">Không tìm thấy địa chỉ hợp lệ để chuyển hướng (chỉ hỗ trợ http/https).</p>
          <Link href="/" className="btn-primary mt-4 inline-flex">Về trang chủ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-amber-200/60 bg-amber-50 px-5 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
          <ShieldAlert className="text-amber-600 dark:text-amber-400" size={20} />
          <h1 className="font-semibold text-amber-700 dark:text-amber-300">Bạn đang rời khỏi diễn đàn</h1>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Bạn sắp được chuyển hướng đến một <b>liên kết bên ngoài</b>. Chúng tôi không kiểm soát và không chịu
            trách nhiệm về nội dung của trang này. Hãy chắc chắn bạn tin tưởng nó trước khi tiếp tục.
          </p>

          {/* Địa chỉ đích */}
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-3 dark:border-ink-700 dark:bg-ink-800/50">
            <div className="flex items-center gap-1.5 text-xs text-ink-500"><Globe size={13} /> Tên miền đích</div>
            <div className="mt-0.5 break-all font-semibold text-brand-600">{host}</div>
            <div className="mt-1 break-all text-xs text-ink-400">{target}</div>
          </div>

          {!cancelled ? (
            <>
              <div className="flex items-center justify-center gap-3 text-sm text-ink-500">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-xl font-bold text-brand-600 dark:bg-ink-800">{seconds}</span>
                <span>Tự động chuyển hướng sau <b>{seconds}</b> giây…</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a href={target} className="btn-primary flex-1 justify-center">
                  <ExternalLink size={16} /> Đồng ý &amp; tiếp tục
                </a>
                <button onClick={() => setCancelled(true)} className="btn-outline flex-1 justify-center">
                  Huỷ
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="rounded-lg bg-ink-100 px-3 py-2 text-center text-sm text-ink-500 dark:bg-ink-800">
                Đã huỷ chuyển hướng. Bạn vẫn có thể tiếp tục thủ công nếu muốn.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a href={target} className="btn-outline flex-1 justify-center">
                  <ExternalLink size={16} /> Vẫn tiếp tục
                </a>
                <Link href="/" className="btn-primary flex-1 justify-center">
                  <ArrowLeft size={16} /> Về trang chủ
                </Link>
              </div>
            </>
          )}

          <p className="text-center text-[11px] text-ink-400">
            Mẹo an toàn: cảnh giác với trang yêu cầu đăng nhập, tải file hoặc nhập thông tin cá nhân.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GoPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <RedirectInner />
    </Suspense>
  );
}
