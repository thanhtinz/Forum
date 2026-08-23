'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';

/**
 * Tải bản sao lưu.
 *
 * Không dùng thẻ `<a download>` vì tệp có thể mất khá lâu để dựng và người dùng
 * sẽ không thấy gì đang xảy ra; ở đây tải bằng fetch để hiện trạng thái chờ,
 * rồi mới lưu tệp xuống máy.
 */
export function DownloadBackupButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Không tạo được bản sao lưu.');
      }

      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1]
        ?? 'nova-backup.json.gz';
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);

      router.refresh(); // cập nhật mốc "lần gần nhất"
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tạo được bản sao lưu.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button type="button" onClick={run} disabled={busy} className="btn-primary flex items-center gap-1.5 !px-3.5 !py-2 text-sm disabled:opacity-60">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {busy ? 'Đang dựng tệp…' : 'Tải bản sao lưu'}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
