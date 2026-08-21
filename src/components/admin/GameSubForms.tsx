'use client';

import { useActionState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import {
  addImage, upsertCompatibility, upsertFile, upsertVersion, type ActionState,
} from '@/app/(site)/admin/games/actions';

export interface IdName { id: string; name: string }

/** Thêm / sửa một version của game. */
export function VersionForm({ gameId, versions }: { gameId: string; versions: IdName[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(upsertVersion, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="gameId" value={gameId} />
      <Select name="versionId" label="Sửa version có sẵn" options={versions} empty="— Tạo version mới —" />
      <Input name="version" label="Số hiệu *" placeholder="1.0.2" required />
      <Input name="releaseDate" label="Ngày phát hành" type="date" />
      <Input name="sizeBytes" label="Dung lượng (byte)" type="number" />
      <Input name="note" label="Ghi chú" />
      <label className="flex items-end gap-4 pb-2 text-sm">
        <span className="flex items-center gap-1.5"><input type="checkbox" name="latest" /> Latest</span>
        <span className="flex items-center gap-1.5"><input type="checkbox" name="playOnline" /> Play Online</span>
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Changelog</span>
        <textarea name="changelog" rows={2} className="input" />
      </label>
      <Submit pending={pending} state={state} label="Lưu version" />
    </form>
  );
}

/** Gắn file JAR/JAD cho một version. */
export function FileForm({ versions }: { versions: IdName[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(upsertFile, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <Select name="versionId" label="Version *" options={versions} required />
      <Select
        name="type" label="Loại file *" required
        options={[{ id: 'JAR', name: 'JAR' }, { id: 'JAD', name: 'JAD' }, { id: 'PATCH', name: 'PATCH' }]}
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

/** Một dòng trong ma trận tương thích game × emulator profile. */
export function CompatForm({ gameId, versions, profiles }: { gameId: string; versions: IdName[]; profiles: IdName[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(upsertCompatibility, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="gameId" value={gameId} />
      <Select name="profileId" label="Emulator profile *" options={profiles} required />
      <Select name="versionId" label="Áp dụng cho version" options={versions} empty="— Mọi version —" />
      <Select
        name="support" label="Mức hỗ trợ"
        options={[{ id: 'FULL', name: 'Chạy tốt' }, { id: 'BETA', name: 'Beta' }, { id: 'NONE', name: 'Không chạy' }]}
      />
      <Input name="note" label="Ghi chú" />
      <Submit pending={pending} state={state} label="Lưu tương thích" />
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

function Select({ name, label, options, empty, required }: {
  name: string; label: string; options: IdName[]; empty?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">{label}</span>
      <select name={name} required={required} defaultValue="" className="input !py-2 text-sm">
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
