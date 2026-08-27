'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Hộp thoại dựng ở gốc trang thay vì nằm trong cây thẻ của nút mở.
 *
 * Cùng lý do với Popover: các khối `.card` đều có `overflow-hidden`, hộp thoại
 * đặt bên trong sẽ bị cắt ngay ở mép khối. Dựng ở `document.body` với
 * `position: fixed` thì không tổ tiên nào cắt được.
 *
 * Khoá cuộn nền khi đang mở — mở hộp thoại rồi cuộn chuột mà trang phía sau
 * trôi đi là cảm giác hỏng rõ nhất của một hộp thoại tự dựng.
 */
export function Modal({ open, onClose, title, children, className }: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);

    // Giữ nguyên giá trị cũ rồi trả lại đúng như thế: đặt cứng về '' sẽ xoá
    // mất `overflow` mà trang có thể đã tự đặt vì lý do khác.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true"
      // Chỉ đóng khi bấm đúng vào nền: bấm trong hộp rồi thả chuột ra ngoài
      // (kéo chọn chữ) không được tính là bấm ra ngoài.
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef}
        className={cn('w-full max-w-md rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-900', className)}>
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
          <h2 className="min-w-0 truncate font-bold">{title}</h2>
          <button type="button" onClick={onClose} title="Đóng"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
