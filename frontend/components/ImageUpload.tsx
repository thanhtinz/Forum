'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadImage } from '@/lib/api';

interface Props {
  value?: string;
  onUploaded: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onUploaded, label = 'Tải ảnh lên' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function handleFile(file: File) {
    setBusy(true);
    setErr('');
    try {
      const r = await uploadImage(file);
      onUploaded(r.url);
    } catch (e: any) {
      setErr(e.message || 'Tải ảnh thất bại');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-outline inline-flex items-center gap-2 !py-1.5 text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {busy ? 'Đang tải…' : label}
        </button>
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="preview"
            className="h-12 w-12 rounded-lg border border-ink-200 object-cover dark:border-ink-700"
          />
        )}
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
    </div>
  );
}
