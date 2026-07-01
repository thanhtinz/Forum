'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

export interface Draggable {
  style: CSSProperties;                       // vị trí (fixed) cho nút
  onPointerDown: (e: ReactPointerEvent) => void;
  dragging: boolean;
  movedRef: React.MutableRefObject<boolean>;  // true nếu vừa kéo (để chặn onClick mở panel)
  panelStyle: (w: number, h: number) => CSSProperties; // vị trí panel mở ra NGAY tại chỗ nút
  panelPointerDown: (e: ReactPointerEvent) => void;    // gắn vào header panel để kéo panel
}

// Cho phép nút nổi kéo thả tự do; lưu vị trí vào localStorage theo `key`.
export function useDraggable(key: string, def: { right: number; bottom: number }): Draggable {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
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
        setPanelPos(null); // di chuyển nút → panel mở lại bám theo nút
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

  // Panel mở ra ngay tại vị trí nút (neo theo góc nút, bung lên/sang trái), kẹp trong màn hình.
  // Nếu người dùng đã kéo panel (panelPos) thì dùng vị trí đó.
  function panelStyle(w: number, h: number): CSSProperties {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const pw = Math.min(w, vw - 16);
    const ph = Math.min(h, vh - 16);
    if (panelPos) {
      const left = Math.max(8, Math.min(panelPos.x, vw - pw - 8));
      const top = Math.max(8, Math.min(panelPos.y, vh - ph - 8));
      return { position: 'fixed', left, top, right: 'auto', bottom: 'auto' };
    }
    const BTN = 44;
    const bx = pos ? pos.x : vw - def.right - BTN;
    const by = pos ? pos.y : vh - def.bottom - BTN;
    let left = bx + BTN - pw;
    let top = by - ph;
    if (top < 8) top = Math.min(by + BTN, vh - ph - 8);
    left = Math.max(8, Math.min(left, vw - pw - 8));
    top = Math.max(8, Math.min(top, vh - ph - 8));
    return { position: 'fixed', left, top, right: 'auto', bottom: 'auto' };
  }

  // Kéo cả panel bằng header (gắn data-drag-panel lên gốc panel).
  function panelPointerDown(e: ReactPointerEvent) {
    if (e.button === 2) return;
    const target = e.target as HTMLElement;
    if (target.closest('button,input,textarea,select,a')) return; // không kéo khi bấm nút/ô nhập
    const panel = (e.currentTarget as HTMLElement).closest('[data-drag-panel]') as HTMLElement | null;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const start = { px: e.clientX, py: e.clientY, x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    const onMove = (ev: PointerEvent) => {
      const nx = Math.min(window.innerWidth - start.w - 4, Math.max(4, start.x + ev.clientX - start.px));
      const ny = Math.min(window.innerHeight - start.h - 4, Math.max(4, start.y + ev.clientY - start.py));
      setPanelPos({ x: nx, y: ny });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return { style, onPointerDown, dragging, movedRef, panelStyle, panelPointerDown };
}
