'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { format } from 'date-fns';
import type { DownloadPlatform } from '@prisma/client';
import {
  AlertTriangle, Apple, CheckCircle2, Coffee, Coins, Download, Globe, Loader2,
  Lock, LogIn, Monitor, Package, ShieldCheck, Smartphone, Terminal,
} from 'lucide-react';
import { unlockGameVersion } from '@/app/(site)/games/actions';
import { DOWNLOAD_PLATFORMS, DOWNLOAD_PLATFORM_ORDER } from '@/lib/game';
import { cn, fmtBytes, fmtCount } from '@/lib/utils';

const PLATFORM_ICON = { Monitor, Apple, Terminal, Smartphone, Globe, Coffee } as const;

export interface VersionFile {
  id: string;
  type: string;
  sizeBytes: number | null;
  checksum: string | null;
  checksumAlgo: string;
  available: boolean;
}

export interface VersionInfo {
  id: string;
  platform: DownloadPlatform;
  version: string;
  releaseDate: string | null;
  changelog: string | null;
  sizeBytes: number | null;
  latest: boolean;
  note: string | null;
  files: VersionFile[];
  /** Bản này còn khoá điểm RIÊNG, độc lập với khoá của cả game. */
  locked: boolean;
  price: number;
}

export interface DownloadPanelProps {
  slug: string;
  versions: VersionInfo[];
  loggedIn: boolean;
  myPoints?: number;
  callbackUrl: string;
}

/**
 * Khung tải game: chọn nền tảng → chọn version → chọn file.
 *
 * Mỗi nền tảng có dãy version riêng, nên đổi nút nền tảng là đổi luôn danh
 * sách version bên dưới. Link tải là signed URL do backend cấp sau khi kiểm
 * tra file, nên phải xin ngay lúc bấm chứ không nhúng sẵn vào HTML.
 */
export function DownloadPanel({ slug, versions, loggedIn, myPoints, callbackUrl }: DownloadPanelProps) {
  // Nền tảng nào có version thì mới dựng nút, giữ đúng thứ tự đã khai báo.
  const platforms = useMemo(
    () => DOWNLOAD_PLATFORM_ORDER.filter((p) => versions.some((v) => v.platform === p)),
    [versions],
  );

  const [platform, setPlatform] = useState<DownloadPlatform | null>(platforms[0] ?? null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockErr, setUnlockErr] = useState<string | null>(null);
  const [unlockPending, startUnlock] = useTransition();

  const ofPlatform = useMemo(
    () => versions.filter((v) => v.platform === platform),
    [versions, platform],
  );

  // Chưa chọn tay thì bám bản mới nhất của nền tảng đang xem; đổi nền tảng mà
  // vẫn giữ versionId cũ thì id đó không còn trong danh sách nên rơi về mặc định.
  const current = ofPlatform.find((v) => v.id === versionId)
    ?? ofPlatform.find((v) => v.latest)
    ?? ofPlatform[0];

  if (platforms.length === 0 || !current || !platform) {
    return <div className="card p-6 text-center text-sm text-ink-400" id="download">Chưa có file tải cho game này.</div>;
  }

  const download = async (file: VersionFile) => {
    setBusy(file.id);
    setError(null);
    try {
      const res = await fetch(`/api/games/${slug}/download?version=${current.id}&type=${file.type}`);
      const data = (await res.json()) as { url?: string; error?: string };
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

  const primary = current.files.find((f) => f.available) ?? current.files[0];

  const onUnlockVersion = () => {
    setUnlockErr(null);
    startUnlock(async () => {
      const r = await unlockGameVersion(current.id);
      if (r.error) { setUnlockErr(r.error); return; }
      window.location.reload();
    });
  };

  return (
    <div className="card p-4 sm:p-5" id="download">
      <h3 className="zib-title mb-4 flex items-center gap-2"><Package size={18} /> Tải game</h3>

      {/* Nút nền tảng — xếp theo bề rộng chữ chứ không chia đôi cứng: chia đôi
          thì một nền tảng duy nhất vẫn chỉ được nửa cột và bị cắt mất tên. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {platforms.map((p) => {
          const meta = DOWNLOAD_PLATFORMS[p];
          const Icon = PLATFORM_ICON[meta.icon];
          const active = p === platform;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              onClick={() => { setPlatform(p); setVersionId(null); setError(null); }}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition',
                active
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300',
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {ofPlatform.length > 1 && (
        <div className="mb-4">
          <label htmlFor="game-version" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
            Phiên bản
          </label>
          <select
            id="game-version"
            value={current.id}
            onChange={(e) => { setVersionId(e.target.value); setError(null); }}
            className="input"
          >
            {ofPlatform.map((v) => (
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
        <dt className="text-ink-400">Nền tảng</dt>
        <dd className="text-right font-medium">{DOWNLOAD_PLATFORMS[platform].label}</dd>
        <dt className="text-ink-400">Phiên bản</dt>
        <dd className="text-right font-medium">v{current.version}</dd>
        <dt className="text-ink-400">Dung lượng</dt>
        <dd className="text-right font-medium">{fmtBytes(current.sizeBytes ?? primary?.sizeBytes)}</dd>
        <dt className="text-ink-400">Phát hành</dt>
        <dd className="text-right font-medium">
          {current.releaseDate ? format(new Date(current.releaseDate), 'dd/MM/yyyy') : '—'}
        </dd>
      </dl>

      {current.note && <p className="mb-3 text-xs text-ink-500">{current.note}</p>}

      {current.locked ? (
        // Bản này thu điểm RIÊNG dù cả game đã mở — không dựng file nào cả,
        // cùng lý do khoá ở mức game: chưa có quyền thì đường tải không được
        // lộ ra trong mã nguồn trang.
        <div className="rounded-xl border-2 border-dashed border-amber-400 p-3.5 text-center">
          <span className="mx-auto grid size-9 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50">
            <Lock size={16} />
          </span>
          <p className="mt-2 text-xs text-ink-500">Bản v{current.version} này cần mở khoá riêng.</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-lg font-black text-ink-800 dark:text-ink-100">
            <Coins size={16} className="text-amber-500" /> {fmtCount(current.price)}
            <span className="text-xs font-semibold text-ink-500">điểm</span>
          </p>
          {loggedIn ? (
            <>
              <button type="button" onClick={onUnlockVersion} disabled={unlockPending}
                className="btn-primary mt-2.5 w-full !py-2 text-sm disabled:opacity-60">
                <Coins size={14} /> {unlockPending ? 'Đang mở khoá…' : 'Dùng điểm để mở khoá bản này'}
              </button>
              {myPoints != null && (
                <p className="retro-sub mt-1 text-ink-400">
                  Bạn đang có {fmtCount(myPoints)} điểm
                  {myPoints < current.price && (
                    <span className="text-red-500"> — còn thiếu {fmtCount(current.price - myPoints)}</span>
                  )}
                </p>
              )}
            </>
          ) : (
            <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="btn-primary mt-2.5 w-full !py-2 text-sm">
              <LogIn size={14} /> Đăng nhập để mở khoá
            </Link>
          )}
          {unlockErr && <p className="mt-2 text-xs font-medium text-red-600">{unlockErr}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {current.files.length === 0 && (
            <p className="rounded-lg bg-ink-50 p-2.5 text-center text-xs text-ink-400 dark:bg-ink-800/60">
              Bản này chưa gắn file tải.
            </p>
          )}
          {current.files.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => download(f)}
              disabled={!f.available || busy !== null}
              className="btn-outline w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === f.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              TẢI {f.type}{f.sizeBytes != null && ` · ${fmtBytes(f.sizeBytes)}`}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40">
          <AlertTriangle size={14} className="mt-px shrink-0" />{error}
        </p>
      )}

      {primary?.checksum && (
        <p className="mt-3 break-all rounded-lg bg-ink-50 p-2.5 text-[11px] text-ink-400 dark:bg-ink-800/60">
          <ShieldCheck size={12} className="mr-1 inline" />
          {primary.checksumAlgo.toUpperCase()}: <code>{primary.checksum}</code>
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
