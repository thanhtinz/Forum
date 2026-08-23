'use client';

import { useActionState, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { DownloadPlatform } from '@prisma/client';
import { DOWNLOAD_PLATFORMS, DOWNLOAD_PLATFORM_ORDER } from '@/lib/game';
import { addImage, upsertFile, upsertVersion, type ActionState } from '@/app/admin/games/actions';

export interface IdName { id: string; name: string }

/** Version kèm nền tảng — form file lọc loại file theo nền tảng của version. */
export interface VersionOption extends IdName { platform: DownloadPlatform }

const PLATFORM_OPTIONS: IdName[] = DOWNLOAD_PLATFORM_ORDER
  .map((p) => ({ id: p, name: DOWNLOAD_PLATFORMS[p].label }));

/** Thêm / sửa một version của game (mỗi version thuộc đúng một nền tảng). */
export function VersionForm({ gameId, versions }: { gameId: string; versions: VersionOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(upsertVersion, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="gameId" value={gameId} />
      <Select name="versionId" label="Sửa version có sẵn" options={versions} empty="— Tạo version mới —" />
      <Select name="platform" label="Nền tảng *" options={PLATFORM_OPTIONS} required />
      <Input name="version" label="Số hiệu *" placeholder="1.0.2" required />
      <Input name="releaseDate" label="Ngày phát hành" type="date" />
      <Input name="sizeBytes" label="Dung lượng (byte)" type="number" />
      <Input name="note" label="Ghi chú" />
      <label className="flex items-end gap-4 pb-2 text-sm">
        <span className="flex items-center gap-1.5">
          <input type="checkbox" name="latest" /> Latest của nền tảng này
        </span>
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Changelog</span>
        <textarea name="changelog" rows={2} className="input" />
      </label>
      <Submit pending={pending} state={state} label="Lưu version" />
    </form>
  );
}

/** Gắn file tải cho một version — loại file lọc theo nền tảng của version đó. */
export function FileForm({ versions }: { versions: VersionOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(upsertFile, {});
  const [versionId, setVersionId] = useState('');

  const picked = versions.find((v) => v.id === versionId);
  const types = picked ? DOWNLOAD_PLATFORMS[picked.platform].fileTypes : [];

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <Select
        name="versionId" label="Version *" options={versions} required
        value={versionId} onChange={setVersionId}
      />
      <Select
        name="type" label="Loại file *" required
        options={types.map((t) => ({ id: t, name: t }))}
        empty={picked ? '— Chọn —' : '— Chọn version trước —'}
      />
      <Input name="storageKey" label="Storage key *" placeholder="games/contra-4/1.0.2/game.jar" required />
      <Input name="fileName" label="Tên file khi tải" placeholder="contra-4-1.0.2.jar" />
      <Input name="sizeBytes" label="Dung lượng (byte)" type="number" />
      <Input name="checksum" label="Checksum" placeholder="sha256…" />
      <Select
        name="scanStatus" label="Kết quả quét"
        options={[
          { id: 'PENDING', name: 'Chờ quét' }, { id: 'CLEAN', name: 'Sạch' },
          { id: 'SUSPICIOUS', name: 'Nghi ngờ' }, { id: 'QUARANTINED', name: 'Cách ly' },
        ]}
      />
      <Input name="scanNote" label="Ghi chú quét" />
      <Submit pending={pending} state={state} label="Lưu file" />
    </form>
  );
}

/** Thêm ảnh (icon/cover/screenshot). */
export function ImageForm({ gameId }: { gameId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addImage, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="gameId" value={gameId} />
      <Select
        name="type" label="Loại"
        options={[
          { id: 'SCREENSHOT', name: 'Screenshot' }, { id: 'ICON', name: 'Icon' },
          { id: 'COVER', name: 'Cover' }, { id: 'TRAILER', name: 'Trailer' },
        ]}
      />
      <Input name="storageKey" label="Đường dẫn ảnh *" placeholder="games/contra-4/shot-1.png" required />
      <Input name="caption" label="Chú thích" />
      <Input name="sortOrder" label="Thứ tự" type="number" />
      <Input name="width" label="Rộng (px)" type="number" />
      <Input name="height" label="Cao (px)" type="number" />
      <Submit pending={pending} state={state} label="Thêm ảnh" />
    </form>
  );
}

// ── Phần tử dùng chung ────────────────────────────────────

function Input({ name, label, ...rest }: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">{label}</span>
      <input name={name} className="input !py-2 text-sm" {...rest} />
    </label>
  );
}

function Select({ name, label, options, empty, required, value, onChange }: {
  name: string; label: string; options: IdName[]; empty?: string; required?: boolean;
  /** Truyền cặp value/onChange để biến thành ô có điều khiển (lọc ô khác theo nó). */
  value?: string; onChange?: (v: string) => void;
}) {
  const controlled = value !== undefined && onChange !== undefined;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">{label}</span>
      <select
        name={name}
        required={required}
        className="input !py-2 text-sm"
        {...(controlled ? { value, onChange: (e) => onChange(e.target.value) } : { defaultValue: '' })}
      >
        <option value="">{empty ?? '— Chọn —'}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

function Submit({ pending, state, label }: { pending: boolean; state: ActionState; label: string }) {
  return (
    <div className="sm:col-span-2">
      {state.error && <p className="mb-2 text-sm text-red-500">{state.error}</p>}
      {state.ok && <p className="mb-2 text-sm text-emerald-600">Đã lưu.</p>}
      <button type="submit" disabled={pending} className="btn-primary !py-2 text-sm">
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {label}
      </button>
    </div>
  );
}
