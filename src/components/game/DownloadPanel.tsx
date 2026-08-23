'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Download, FileCode2, Loader2, Package, ShieldCheck } from 'lucide-react';
import { fmtBytes } from '@/lib/utils';

export interface VersionFile {
  type: 'JAR' | 'JAD' | 'PATCH';
  sizeBytes: number | null;
  checksum: string | null;
  checksumAlgo: string;
  available: boolean;
}

export interface VersionInfo {
  id: string;
  version: string;
  releaseDate: string | null;
  changelog: string | null;
  sizeBytes: number | null;
  latest: boolean;
  note: string | null;
  files: VersionFile[];
}

export interface DownloadPanelProps {
  slug: string;
  versions: VersionInfo[];
}

/**
 * Khung tải game: chọn version → chọn JAR/JAD.
 *
 * Link tải là signed URL do backend cấp sau khi kiểm tra file, nên phải xin
 * ngay lúc bấm chứ không nhúng sẵn vào HTML.
 */
export function DownloadPanel({ slug, versions }: DownloadPanelProps) {
  const [versionId, setVersionId] = useState(versions.find((v) => v.latest)?.id ?? versions[0]?.id ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = useMemo(() => versions.find((v) => v.id === versionId) ?? versions[0], [versions, versionId]);

  if (!current) {
    return <div className="card p-6 text-center text-sm text-ink-400">Chưa có file tải cho game này.</div>;
  }

  const download = async (type: 'JAR' | 'JAD') => {
    setBusy(type);
    setError(null);
    try {
      const res = await fetch(`/api/games/${slug}/download?version=${current.id}&type=${type}`);
      const data = (await res.json()) as { url?: string; fileName?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(
          data.error === 'FILE_QUARANTINED'
            ? 'File đang bị cách ly do nghi ngờ an toàn.'
            : data.error === 'RATE_LIMITED'
              ? 'Bạn tải quá nhanh, hãy chờ một chút.'
              : 'Không lấy được liên kết tải. Thử lại sau nhé.',
        );
        return;
      }
      // Điều hướng thẳng tới signed URL — trình duyệt tự tải file.
      window.location.href = data.url;
    } catch {
      setError('Lỗi mạng khi lấy liên kết tải.');
    } finally {
      setBusy(null);
    }
  };

  const jar = current.files.find((f) => f.type === 'JAR');
  const jad = current.files.find((f) => f.type === 'JAD');

  return (
    <div className="card p-4 sm:p-5" id="download">
      <h3 className="zib-title mb-4 flex items-center gap-2"><Package size={18} /> Tải game</h3>

      {versions.length > 1 && (
        <div className="mb-4">
          <label htmlFor="game-version" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
            Phiên bản
          </label>
          <select
            id="game-version"
            value={versionId}
            onChange={(e) => { setVersionId(e.target.value); setError(null); }}
            className="input"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version}
                {v.latest ? ' (mới nhất)' : ''}
                {v.releaseDate ? ` · ${format(new Date(v.releaseDate), 'dd/MM/yyyy')}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <dl className="mb-4 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-ink-400">Dung lượng</dt>
        <dd className="text-right font-medium">{fmtBytes(current.sizeBytes ?? jar?.sizeBytes)}</dd>
        <dt className="text-ink-400">Phát hành</dt>
        <dd className="text-right font-medium">
          {current.releaseDate ? format(new Date(current.releaseDate), 'dd/MM/yyyy') : '—'}
        </dd>
      </dl>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => download('JAR')}
          disabled={!jar?.available || busy !== null}
          className="btn-outline w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'JAR' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          DOWNLOAD JAR{jar?.sizeBytes != null && ` · ${fmtBytes(jar.sizeBytes)}`}
        </button>
        <button
          type="button"
          onClick={() => download('JAD')}
          disabled={!jad?.available || busy !== null}
          className="btn-outline w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'JAD' ? <Loader2 size={16} className="animate-spin" /> : <FileCode2 size={16} />}
          DOWNLOAD JAD{jad?.sizeBytes != null && ` · ${fmtBytes(jad.sizeBytes)}`}
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40">
          <AlertTriangle size={14} className="mt-px shrink-0" />{error}
        </p>
      )}

      {jar?.checksum && (
        <p className="mt-3 break-all rounded-lg bg-ink-50 p-2.5 text-[11px] text-ink-400 dark:bg-ink-800/60">
          <ShieldCheck size={12} className="mr-1 inline" />
          {jar.checksumAlgo.toUpperCase()}: <code>{jar.checksum}</code>
        </p>
      )}

      {current.changelog && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-500 hover:text-brand-600">Changelog v{current.version}</summary>
          <p className="mt-2 whitespace-pre-line text-ink-500">{current.changelog}</p>
        </details>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-400">
        <CheckCircle2 size={13} className="mt-px shrink-0 text-emerald-500" />
        Liên kết tải có chữ ký và hết hạn sau vài phút. Hãy đối chiếu checksum sau khi tải.
      </p>
    </div>
  );
}
