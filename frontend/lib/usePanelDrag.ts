'use client';

import { useState, type CSSProperties, type PointerEvent as RPE } from 'react';

// Cho phép kéo cả "card" (panel) đã mở bằng header. Gắn data-drag-panel lên gốc panel,
// dùng `style` cho gốc panel và `onPointerDown` cho thanh header.
export function usePanelDrag() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function onPointerDown(e: RPE) {
    if (e.button === 2) return;
    const t = e.target as HTMLElement;
    if (t.closest('button,input,textarea,select,a')) return; // không kéo khi bấm nút/ô nhập
    const panel = (e.currentTarget as HTMLElement).closest('[data-drag-panel]') as HTMLElement | null;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const start = { px: e.clientX, py: e.clientY, x: r.left, y: r.top, w: r.width, h: r.height };
    const move = (ev: PointerEvent) => {
      const nx = Math.min(window.innerWidth - start.w - 4, Math.max(4, start.x + ev.clientX - start.px));
      const ny = Math.min(window.innerHeight - start.h - 4, Math.max(4, start.y + ev.clientY - start.py));
      setPos({ x: nx, y: ny });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // null → dùng vị trí mặc định trong className; khi đã kéo → ghi đè left/top
  const style: CSSProperties | undefined = pos
    ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', transform: 'none' }
    : undefined;

  return { style, onPointerDown };
}
