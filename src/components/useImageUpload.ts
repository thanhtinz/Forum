'use client';

import { useCallback, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';

/**
 * Logic tải ảnh dùng chung cho các ô chọn ảnh: bấm nút, kéo–thả vào ô,
 * hoặc dán ảnh từ clipboard (Ctrl+V). Ảnh đi qua /api/upload rồi trả về đường dẫn.
 */
export function useImageUpload(onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) { setError(j.error ?? 'Tải ảnh thất bại.'); return; }
      onUploaded(j.url);
    } catch {
      setError('Không tải được ảnh, vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [onUploaded]);

  /** Gắn vào vùng bao ngoài để nhận ảnh kéo vào. */
  const dropProps = {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: DragEvent) => {
      const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      setDragging(false);
      void upload(file);
    },
  };

  /** Gắn vào ô nhập để dán ảnh thẳng từ clipboard. */
  const onPaste = (e: ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
    if (!file) return; // dán chữ (link ảnh) thì để nguyên hành vi mặc định
    e.preventDefault();
    void upload(file);
  };

  return { upload, uploading, error, setError, dragging, dropProps, onPaste, fileRef };
}
