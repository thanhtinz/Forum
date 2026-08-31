'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import type { DownloadPlatform } from '@prisma/client';
import { DOWNLOAD_PLATFORMS, DOWNLOAD_PLATFORM_ORDER } from '@/lib/game';
import { addImage, upsertFile, upsertVersion, type ActionState } from '@/app/admin/games/actions';
import { fmtBytes } from '@/lib/utils';

export interface IdName { id: string; name: string }

/**
 * Version kèm ĐỦ dữ liệu đang lưu, không chỉ mỗi cái tên.
 *
 * Trước đây chỉ mang `id + name + platform`, nên chọn "Sửa version có sẵn" thì
 * mọi ô đều trống — mà `upsertVersion` lại ghi đè bằng đúng những ô trống ấy.
 * Đổi một chữ trong số hiệu là mất sạch changelog, dung lượng, ghi chú và
 * GIÁ ĐIỂM (bản đang bán tự thành miễn phí).
 */
export interface VersionOption extends IdName {
  platform: DownloadPlatform;
  version: string;
  /** Dạng `yyyy-MM-dd` cho ô `type="date"`; null nghĩa là chưa đặt. */
  releaseDate: string | null;
  changelog: string | null;
  /** BigInt không đi qua ranh giới server→client được, nên truyền dạng chuỗi. */
  sizeBytes: string | null;
  note: string | null;
  pricePoints: number | null;
  latest: boolean;
}

/** File tải kèm đủ dữ liệu đang lưu — cùng lý do với `VersionOption`. */
export interface FileOption extends IdName {
  versionId: string;
  type: string;
  storageKey: string;
  fileName: string | null;
  sizeBytes: string | null;
  checksum: string | null;
  checksumAlgo: string;
  mimeType: string | null;
  scanStatus: string;
  scanNote: string | null;
}

const PLATFORM_OPTIONS: IdName[] = DOWNLOAD_PLATFORM_ORDER
  .map((p) => ({ id: p, name: DOWNLOAD_PLATFORMS[p].label }));

const SCAN_OPTIONS: IdName[] = [
  { id: 'PENDING', name: 'Chờ quét' }, { id: 'CLEAN', name: 'Sạch' },
  { id: 'SUSPICIOUS', name: 'Nghi ngờ' }, { id: 'QUARANTINED', name: 'Cách ly' },
];

const chuoi = (v: string | number | null | undefined) => (v == null ? '' : String(v));

/**
 * Mọi ô ở hai biểu mẫu dưới đây đều là ô CÓ ĐIỀU KHIỂN, không dùng
 * `defaultValue`.
 *
 * `defaultValue` chỉ đặt thuộc tính lúc gắn, còn giá trị người dùng gõ nằm ở
 * thuộc tính sống của DOM — nên sau một lượt lưu (Next dựng lại cây), ô chọn
 * quay về rỗng mà ô chữ vẫn giữ nguyên chữ cũ: biểu mẫu hiện ra là "gắn file
 * mới" nhưng lại điền sẵn dữ liệu của tệp vừa sửa, mà cảnh báo đè cũng không
 * kịp hiện vì ô version/loại đã rỗng. Ô có điều khiển thì trạng thái luôn khớp
 * với thứ đang chọn, không có ngã ba nào.
 */

/**
 * Lưu xong thì dọn biểu mẫu về trạng thái "thêm mới".
 *
 * Không dọn thì sau một lượt lưu, ô chọn quay về rỗng mà ô chữ vẫn giữ chữ cũ —
 * biểu mẫu hiện ra là "gắn file mới" nhưng lại điền sẵn dữ liệu của bản ghi vừa
 * sửa, và cảnh báo đè cũng không kịp hiện vì ô version/loại đã rỗng. Cùng cách
 * với các bảng quản trị khác: lưu xong là đóng biểu mẫu sửa lại.
 *
 * So theo ĐỊNH DANH của `state` chứ không theo `state.ok`: lưu hai lần liên
 * tiếp thì `ok` vẫn đúng suốt, dọn theo cờ ấy sẽ bỏ sót lượt thứ hai.
 */
function useDonSauKhiLuu(state: ActionState, don: () => void) {
  const truoc = useRef<ActionState | null>(null);
  useEffect(() => {
    if (state === truoc.current) return;
    truoc.current = state;
    if (state.ok) don();
    // `don` dựng lại mỗi lượt vẽ nên không đưa vào danh sách phụ thuộc — mốc
    // duy nhất đáng theo dõi là `state`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

/** Thêm / sửa một version của game (mỗi version thuộc đúng một nền tảng). */
export function VersionForm({ gameId, versions }: { gameId: string; versions: VersionOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(upsertVersion, {});
  const [versionId, setVersionId] = useState('');
  const [o, setO] = useState(oVersion(undefined));

  const chon = (id: string) => {
    setVersionId(id);
    setO(oVersion(versions.find((v) => v.id === id)));
  };
  useDonSauKhiLuu(state, () => { setVersionId(''); setO(oVersion(undefined)); });

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="gameId" value={gameId} />
      <Select name="versionId" label="Sửa version có sẵn" options={versions}
        empty="— Tạo version mới —" value={versionId} onChange={chon} />
      <Select name="platform" label="Nền tảng *" options={PLATFORM_OPTIONS} required
        value={o.platform} onChange={(v) => setO({ ...o, platform: v })} />
      <O label="Số hiệu *" name="version" required placeholder="1.0.2"
        value={o.version} onChange={(v) => setO({ ...o, version: v })} />
      <O label="Ngày phát hành" name="releaseDate" type="date"
        value={o.releaseDate} onChange={(v) => setO({ ...o, releaseDate: v })} />
      <ODungLuong name="sizeBytes" value={o.sizeBytes} onChange={(v) => setO({ ...o, sizeBytes: v })} />
      <O label="Giá điểm riêng bản này" name="pricePoints" type="number" min={0}
        placeholder="Để trống = theo giá game / miễn phí"
        value={o.pricePoints} onChange={(v) => setO({ ...o, pricePoints: v })} />
      <O label="Ghi chú" name="note" value={o.note} onChange={(v) => setO({ ...o, note: v })} />
      <label className="flex items-end gap-4 pb-2 text-sm">
        <span className="flex items-center gap-1.5">
          <input type="checkbox" name="latest" checked={o.latest}
            onChange={(e) => setO({ ...o, latest: e.target.checked })} />
          {' '}Latest của nền tảng này
        </span>
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Changelog</span>
        <textarea name="changelog" rows={2} className="input" value={o.changelog}
          onChange={(e) => setO({ ...o, changelog: e.target.value })} />
      </label>
      <Submit pending={pending} state={state} label={versionId ? 'Lưu thay đổi' : 'Thêm version'} />
    </form>
  );
}

function oVersion(v: VersionOption | undefined) {
  return {
    platform: chuoi(v?.platform),
    version: chuoi(v?.version),
    releaseDate: chuoi(v?.releaseDate),
    sizeBytes: chuoi(v?.sizeBytes),
    pricePoints: chuoi(v?.pricePoints),
    note: chuoi(v?.note),
    changelog: chuoi(v?.changelog),
    latest: v?.latest ?? false,
  };
}

/** Gắn / sửa file tải — loại file lọc theo nền tảng của version đó. */
export function FileForm({ versions, files }: { versions: VersionOption[]; files: FileOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(upsertFile, {});
  const [fileId, setFileId] = useState('');
  const [o, setO] = useState(oFile(undefined));

  const picked = versions.find((v) => v.id === o.versionId);
  const types = picked ? DOWNLOAD_PLATFORMS[picked.platform].fileTypes : [];

  // Đang GẮN MỚI mà cặp version + loại đã có file: `upsertFile` ghi theo khoá
  // `versionId_type` nên sẽ đè lên bản ghi cũ. Nói trước, đừng để bấm xong mới
  // biết — giao diện cũ báo "Đã lưu." y như lúc tạo mới thật.
  const deDoi = !fileId && o.versionId && o.type
    && files.some((f) => f.versionId === o.versionId && f.type === o.type);

  const chonFile = (id: string) => {
    setFileId(id);
    setO(oFile(files.find((f) => f.id === id)));
  };
  useDonSauKhiLuu(state, () => { setFileId(''); setO(oFile(undefined)); });

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <Select name="fileId" label="Sửa file có sẵn" options={files}
        empty="— Gắn file mới —" value={fileId} onChange={chonFile} />
      {/* Đổi version hay loại file là thôi bám vào bản ghi đang sửa: hai ô này
          hợp thành khoá của bản ghi, đổi một trong hai là trỏ sang chỗ khác. */}
      <Select name="versionId" label="Version *" options={versions} required
        value={o.versionId}
        onChange={(v) => { setFileId(''); setO({ ...o, versionId: v, type: '' }); }} />
      <Select name="type" label="Loại file *" required
        options={types.map((t) => ({ id: t, name: t }))}
        empty={picked ? '— Chọn —' : '— Chọn version trước —'}
        value={o.type} onChange={(v) => { setFileId(''); setO({ ...o, type: v }); }} />

      <O label="Storage key *" name="storageKey" required placeholder="games/contra-4/1.0.2/game.jar"
        value={o.storageKey} onChange={(v) => setO({ ...o, storageKey: v })} />
      <O label="Tên file khi tải" name="fileName" placeholder="contra-4-1.0.2.jar"
        value={o.fileName} onChange={(v) => setO({ ...o, fileName: v })} />
      <ODungLuong name="sizeBytes" value={o.sizeBytes} onChange={(v) => setO({ ...o, sizeBytes: v })} />
      <O label="Checksum" name="checksum" placeholder="sha256…"
        value={o.checksum} onChange={(v) => setO({ ...o, checksum: v })} />
      <O label="Thuật toán checksum" name="checksumAlgo" placeholder="sha256"
        value={o.checksumAlgo} onChange={(v) => setO({ ...o, checksumAlgo: v })} />
      <O label="Kiểu MIME" name="mimeType" placeholder="application/java-archive"
        value={o.mimeType} onChange={(v) => setO({ ...o, mimeType: v })} />
      {/* Ô này trước không có mục rỗng nên mỗi lượt lưu là trạng thái quét rơi
          về "Chờ quét" — sửa tên một tệp đang bị CÁCH LY là vô tình cho tải
          lại, vì đường tải chỉ chặn đúng trạng thái QUARANTINED. */}
      <Select name="scanStatus" label="Kết quả quét" options={SCAN_OPTIONS} khongRong
        value={o.scanStatus} onChange={(v) => setO({ ...o, scanStatus: v })} />
      <O label="Ghi chú quét" name="scanNote"
        value={o.scanNote} onChange={(v) => setO({ ...o, scanNote: v })} />

      {deDoi && (
        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 sm:col-span-2 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          Version này đã có file {o.type}. Lưu tiếp là <b>đè lên</b> bản ghi cũ —
          muốn sửa thì chọn nó ở ô “Sửa file có sẵn”.
        </p>
      )}

      <Submit pending={pending} state={state} label={fileId ? 'Lưu thay đổi' : 'Gắn file'} />
    </form>
  );
}

function oFile(f: FileOption | undefined) {
  return {
    versionId: chuoi(f?.versionId),
    type: chuoi(f?.type),
    storageKey: chuoi(f?.storageKey),
    fileName: chuoi(f?.fileName),
    sizeBytes: chuoi(f?.sizeBytes),
    checksum: chuoi(f?.checksum),
    checksumAlgo: chuoi(f?.checksumAlgo),
    mimeType: chuoi(f?.mimeType),
    // Tệp mới thì mặc định là chưa quét; ô này không có mục rỗng.
    scanStatus: chuoi(f?.scanStatus) || 'PENDING',
    scanNote: chuoi(f?.scanNote),
  };
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

/** Ô chữ có điều khiển. */
function O({ label, value, onChange, ...rest }: {
  label: string; value: string; onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">{label}</span>
      <input className="input !py-2 text-sm" value={value}
        onChange={(e) => onChange(e.target.value)} {...rest} />
    </label>
  );
}

/**
 * Ô dung lượng: vẫn gửi lên BYTE như cũ, nhưng đọc ra MB/GB ngay dưới ô. Gõ
 * 48234496 rồi tự nhẩm xem đúng chưa là chỗ dễ lệch một nghìn lần.
 */
function ODungLuong({ name, value, onChange }: {
  name: string; value: string; onChange: (v: string) => void;
}) {
  const so = Number(value);
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">
        Dung lượng (byte)
      </span>
      <input name={name} type="number" min={0} value={value}
        onChange={(e) => onChange(e.target.value)} className="input !py-2 text-sm" />
      <span className="mt-0.5 block text-[11px] text-ink-400">
        {value && Number.isFinite(so) && so > 0 ? `= ${fmtBytes(so)}` : 'nhập số byte'}
      </span>
    </label>
  );
}

function Select({ name, label, options, empty, required, value, onChange, khongRong }: {
  name: string; label: string; options: IdName[]; empty?: string; required?: boolean;
  /** Truyền cặp value/onChange để biến thành ô có điều khiển (lọc ô khác theo nó). */
  value?: string; onChange?: (v: string) => void;
  /** Bỏ hẳn mục rỗng — dùng cho ô luôn phải có một giá trị. */
  khongRong?: boolean;
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
        {!khongRong && <option value="">{empty ?? '— Chọn —'}</option>}
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
