'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

export interface Draggable {
  style: CSSProperties;                       // vị trí (fixed) cho nút
  onPointerDown: (e: ReactPointerEvent) => void;
  dragging: boolean;
  movedRef: React.MutableRefObject<boolean>;  // true nếu vừa kéo (để chặn onClick mở panel)
}

// Cho phép nút nổi kéo thả tự do; lưu vị trí vào localStorage theo `key`.
export function useDraggable(key: string, def: { right: number; bottom: number }): Draggable {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const startRef = useRef({ px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    try {
      const s = localStorage.getItem('drag:' + key);
      if (s) setPos(JSON.parse(s));
    } catch { /* ignore */ }
  }, [key]);

  // Giữ nút trong màn hình khi thay đổi kích thước cửa sổ
  useEffect(() => {
    const onResize = () => setPos((p) => {
      if (!p) return p;
      return {
        x: Math.min(p.x, window.innerWidth - 56),
        y: Math.min(p.y, window.innerHeight - 56),
      };
    });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function onPointerDown(e: ReactPointerEvent) {
    if (e.button === 2) return; // bỏ qua chuột phải
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    startRef.current = { px: e.clientX, py: e.clientY, x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    movedRef.current = false;
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startRef.current.px;
      const dy = ev.clientY - startRef.current.py;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
      const { x, y, w, h } = startRef.current;
      const nx = Math.min(window.innerWidth - w - 4, Math.max(4, x + dx));
      const ny = Math.min(window.innerHeight - h - 4, Math.max(4, y + dy));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (movedRef.current) {
        setPos((p) => {
          if (p) { try { localStorage.setItem('drag:' + key, JSON.stringify(p)); } catch { /* ignore */ } }
          return p;
        });
      }
      // reset cờ moved sau 1 nhịp để onClick (xảy ra ngay sau pointerup) kịp đọc
      setTimeout(() => { movedRef.current = false; }, 0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const style: CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', touchAction: 'none' }
    : { position: 'fixed', right: def.right, bottom: def.bottom, touchAction: 'none' };

  return { style, onPointerDown, dragging, movedRef };
}
