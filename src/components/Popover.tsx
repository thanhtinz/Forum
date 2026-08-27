'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Bảng thả xuống dựng ở gốc trang thay vì nằm trong cây thẻ của nút bấm.
 *
 * Vì sao phải làm vậy: các khối `.card` của trang đều có `overflow-hidden`
 * (để bo góc không bị nội dung bên trong đè ra). Bảng nào định vị bằng
 * `absolute` bên trong một khối như thế sẽ bị CẮT ngay ở mép khối — bấm nút
 * thì bảng có mở, nhưng người dùng gần như không thấy gì, tưởng nút hỏng.
 * Đã dính đúng lỗi này ở menu Điều hành chủ đề (mất 196/199px) và bảng
 * emoji của phòng chat (mất 172/322px).
 *
 * Dựng ở `document.body` với `position: fixed` thì không tổ tiên nào cắt được
 * nữa. Vị trí tính lại theo nút bấm mỗi khi mở, khi cuộn và khi đổi cỡ màn hình,
 * tự lật lên trên nếu phía dưới không đủ chỗ.
 */
export function Popover({ open, anchor, onClose, align = 'left', side = 'bottom', gap = 8, className, children }: {
  open: boolean;
  /** Nút bấm mở bảng — bảng bám theo nó. */
  anchor: HTMLElement | null;
  onClose: () => void;
  /** Mép nào của bảng thẳng hàng với mép nút. */
  align?: 'left' | 'right';
  /** Ưu tiên đặt bảng ở dưới hay trên nút. Không đủ chỗ thì tự lật. */
  side?: 'bottom' | 'top';
  gap?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const EDGE = 8;

    const roomBelow = vh - a.bottom - gap - EDGE;
    const roomAbove = a.top - gap - EDGE;
    // Đặt theo hướng đã chọn, trừ khi bên đó chật hơn và bên kia đủ chỗ hơn.
    const below = side === 'bottom' ? roomBelow >= h || roomBelow >= roomAbove : roomAbove < h && roomBelow > roomAbove;

    const top = below ? a.bottom + gap : Math.max(EDGE, a.top - gap - h);
    let left = align === 'right' ? a.right - w : a.left;
    left = Math.min(Math.max(EDGE, left), Math.max(EDGE, vw - w - EDGE));

    setPos({ top, left, maxHeight: Math.max(120, below ? roomBelow : roomAbove) });
  }, [anchor, align, side, gap]);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // Cuộn hay đổi cỡ màn hình thì bảng phải bám theo nút, không được đứng yên.
    const onMove = () => place();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, anchor, onClose, place]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      // Đo xong mới hiện: nếu vẽ ngay từ khi chưa biết vị trí thì bảng nháy
      // một cái ở góc trên-trái rồi mới nhảy về đúng chỗ.
      style={{
        position: 'fixed',
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        maxHeight: pos?.maxHeight,
        visibility: pos ? 'visible' : 'hidden',
        zIndex: 60,
      }}
      className={className}
    >
      {children}
    </div>,
    document.body,
  );
}
