'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';
import { markAllForumsRead } from '@/app/(site)/forum/actions';

/**
 * Nút "Đánh dấu đã đọc hết".
 *
 * Chỉ hiện cho người đã đăng nhập — khách không có dấu bài mới nào để xoá.
 */
export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();

  if (done) return <span className="retro-sub shrink-0 text-ink-400">Đã đọc hết</span>;

  return (
    <button type="button" disabled={pending} title="Bỏ dấu bài mới ở mọi chủ đề"
      className="btn-outline shrink-0 gap-1.5 whitespace-nowrap !px-3 !py-1.5 text-sm disabled:opacity-60"
      onClick={() => start(async () => {
        const r = await markAllForumsRead();
        if (r.error) return;
        setDone(true);
        // Dấu "mới" dựng ở máy chủ, nên phải lấy lại trang thì nó mới biến mất.
        router.refresh();
      })}>
      <CheckCheck size={15} /> {pending ? 'Đang lưu…' : 'Đã đọc hết'}
    </button>
  );
}
