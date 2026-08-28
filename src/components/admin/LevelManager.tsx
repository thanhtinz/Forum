'use client';

import { useState, useEffect, useTransition, useActionState } from 'react';
import { Plus, Pencil, Trash2, X, Download, MessageSquarePlus, Upload } from 'lucide-react';
import { saveLevelRule, deleteLevelRule, type LevelState } from '@/app/admin/actions';
import { fmtCount } from '@/lib/utils';
import { ActionForm } from '@/components/ActionForm';

export interface LevelRow {
  id: string; level: number; name: string; expRequired: number;
  color: string | null;
  dailyDownloadLimit: number | null; canPostThread: boolean; canUploadFile: boolean;
  userCount: number;
}

function LevelIconBox({ level, color, className = '' }: {
  level: number; color: string | null; className?: string;
}) {
  return (
    <span className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl text-sm font-bold ${className}`}
      style={{ backgroundColor: (color ?? '#e5e7eb') + '33', color: color ?? '#6b7280' }}>
      Lv{level}
    </span>
  );
}

export function LevelManager({ levels }: { levels: LevelRow[] }) {
  const [editing, setEditing] = useState<LevelRow | null>(null);
  const [creating, setCreating] = useState(false);

  // Gợi ý cấp kế tiếp cho lần thêm mới
  const nextLevel = levels.length ? Math.max(...levels.map((l) => l.level)) + 1 : 1;

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <button type="button" onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Thêm cấp độ</button>
      )}

      {(creating || editing) && (
        <LevelForm key={editing?.id ?? 'new'} initial={editing} nextLevel={nextLevel}
          onDone={() => { setCreating(false); setEditing(null); }} />
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {levels.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Chưa có cấp độ nào. Thành viên sẽ không lên cấp cho tới khi bạn thêm mốc EXP.</div>}
        {levels.map((l) => (
          <LevelRowView key={l.id} row={l} onEdit={() => { setEditing(l); setCreating(false); }} />
        ))}
      </div>
    </div>
  );
}

function LevelRowView({ row, onEdit }: { row: LevelRow; onEdit: () => void }) {
  const [pending, start] = useTransition();

  return (
    <div className="p-3 sm:flex sm:items-center sm:gap-3">
      <LevelIconBox level={row.level} color={row.color} />
      <div className="mt-2 min-w-0 sm:mt-0 sm:flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">Cấp {row.level} · {row.name}</span>
          <span className="chip bg-brand-50 !py-0 text-[11px] text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
            {fmtCount(row.expRequired)} EXP
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Download size={12} /> {row.dailyDownloadLimit == null ? 'Tải không giới hạn' : `${row.dailyDownloadLimit} lượt tải/ngày`}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquarePlus size={12} /> {row.canPostThread ? 'Được đăng chủ đề' : 'Không được đăng chủ đề'}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Upload size={12} /> {row.canUploadFile ? 'Được tải tệp lên' : 'Không được tải tệp lên'}
          </span>
          <span>·</span>
          <span>{fmtCount(row.userCount)} thành viên</span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 sm:mt-0 sm:shrink-0">
        <button type="button" onClick={onEdit} title="Sửa"
          className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"><Pencil size={14} /></button>
        <button type="button" disabled={pending} title="Xoá"
          onClick={() => { if (confirm(`Xoá cấp ${row.level} (${row.name})? Thành viên đang ở cấp này vẫn giữ nguyên cấp, chỉ mất mốc cấu hình.`)) start(() => deleteLevelRule(row.id)); }}
          className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function LevelForm({ initial, nextLevel, onDone }: { initial: LevelRow | null; nextLevel: number; onDone: () => void }) {
  const [state, action, pending] = useActionState<LevelState, FormData>(saveLevelRule, {});
  const [level, setLevel] = useState(initial?.level ?? nextLevel);
  const [color, setColor] = useState(initial?.color ?? '#3b82f6');
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink-900 dark:text-white">{initial ? `Sửa cấp ${initial.level}` : 'Cấp độ mới'}</h2>
        <button type="button" onClick={onDone} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Cấp</span>
          <input name="level" type="number" min={0} value={level}
            onChange={(e) => setLevel(parseInt(e.target.value, 10) || 0)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tên cấp</span>
          <input name="name" defaultValue={initial?.name} className="input" placeholder="Ví dụ: Thành viên tích cực" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">EXP cần đạt</span>
          <input name="expRequired" type="number" min={0} defaultValue={initial?.expRequired ?? ''} className="input" placeholder="Ví dụ: 500" />
          <span className="mt-1 block text-xs text-ink-400">Tích đủ EXP này là lên cấp.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Lượt tải mỗi ngày</span>
          <input name="dailyDownloadLimit" type="number" min={0} defaultValue={initial?.dailyDownloadLimit ?? ''} className="input" placeholder="Để trống = không giới hạn" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Màu</span>
          <input name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="input !h-10 !p-1" />
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="canPostThread" defaultChecked={initial?.canPostThread ?? true} className="accent-brand-500" />
          Được đăng chủ đề diễn đàn
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="canUploadFile" defaultChecked={initial?.canUploadFile ?? false} className="accent-brand-500" />
          Được tải tệp lên
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Huỷ</button>
      </div>
    </ActionForm>
  );
}
