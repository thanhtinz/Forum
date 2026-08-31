'use client';

import { useActionState, useState, useTransition } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { saveGameTaxonomy, deleteGameTaxonomy, type ActionState } from '@/app/admin/games/actions';
import { ActionForm } from '@/components/ActionForm';

export interface TaxonomyRow {
  id: string;
  slug: string;
  name: string;
  order: number;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  featured?: boolean;
  width?: number;
  height?: number;
  /** Số game đang gắn nhãn này — để biết xoá đi thì ảnh hưởng bao nhiêu. */
  count: number;
}

export type Kind = 'genre' | 'platform' | 'resolution';

const LABEL: Record<Kind, { one: string; add: string }> = {
  genre: { one: 'thể loại', add: 'Thêm thể loại' },
  platform: { one: 'dòng máy', add: 'Thêm dòng máy' },
  resolution: { one: 'độ phân giải', add: 'Thêm độ phân giải' },
};

/**
 * Quản lý một nhóm danh mục của kho game.
 *
 * Bốn nhóm dùng chung một khung: khác nhau đúng vài ô nhập, nên chỉ đổi phần
 * ruột biểu mẫu theo `kind` thay vì dựng bốn màn hình gần y hệt nhau.
 */
export function GameTaxonomyManager({ kind, rows }: { kind: Kind; rows: TaxonomyRow[] }) {
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold capitalize">{LABEL[kind].one}</h2>
        <button type="button" onClick={() => { setAdding((v) => !v); setEditing(null); }}
          className="btn-outline !py-1.5 text-sm">
          {adding ? <><X size={15} /> Đóng</> : <><Plus size={15} /> {LABEL[kind].add}</>}
        </button>
      </div>

      {(adding || editing) && (
        <TaxonomyForm kind={kind} initial={editing} onDone={() => { setAdding(false); setEditing(null); }} />
      )}

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">Chưa có {LABEL[kind].one} nào.</p>
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {rows.map((r) => (
            <Row key={r.id} kind={kind} row={r} onEdit={() => { setEditing(r); setAdding(false); }} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ kind, row, onEdit }: { kind: Kind; row: TaxonomyRow; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {row.icon && <span aria-hidden>{row.icon}</span>}
          {row.color && <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />}
          <span className="truncate">{row.name}</span>
          {row.featured && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950/50">Nổi bật</span>}
        </p>
        <p className="retro-sub text-ink-400">
          <code>{row.slug}</code> · thứ tự {row.order} · {row.count} game
        </p>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <button type="button" onClick={onEdit} title="Sửa" aria-label={`Sửa mục ${row.name}`}
          className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800">
          <Pencil size={15} />
        </button>
        <button type="button" disabled={pending} title="Xoá" aria-label={`Xoá mục ${row.name}`}
          onClick={() => {
            const warn = row.count > 0
              ? `Xoá “${row.name}”? ${row.count} game đang gắn nhãn này sẽ mất nhãn, game vẫn còn nguyên.`
              : `Xoá “${row.name}”?`;
            if (!confirm(warn)) return;
            setError(null);
            start(async () => {
              const r = await deleteGameTaxonomy(kind, row.id);
              if (r.error) setError(r.error);
            });
          }}
          className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40">
          <Trash2 size={15} />
        </button>
      </div>

      {error && <p className="basis-full text-xs text-red-600">{error}</p>}
    </li>
  );
}

function TaxonomyForm({ kind, initial, onDone }: { kind: Kind; initial: TaxonomyRow | null; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveGameTaxonomy, {});

  if (state.ok) {
    // Lưu xong thì đóng biểu mẫu ở lượt render kế tiếp.
    queueMicrotask(onDone);
  }

  return (
    <ActionForm action={action} className="mb-4 space-y-3 rounded-xl border border-ink-200 p-3 dark:border-ink-700">
      <input type="hidden" name="kind" value={kind} />
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={kind === 'resolution' ? 'Nhãn hiển thị' : 'Tên'}>
          <input name="name" required defaultValue={initial?.name ?? ''} className="input"
            placeholder={kind === 'resolution' ? '240 × 320' : 'Hành động'} />
        </Field>

        {kind === 'resolution' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rộng (px)">
              <input name="width" type="number" min={1} required defaultValue={initial?.width ?? ''} className="input" />
            </Field>
            <Field label="Cao (px)">
              <input name="height" type="number" min={1} required defaultValue={initial?.height ?? ''} className="input" />
            </Field>
          </div>
        ) : (
          <Field label="Slug" hint="Bỏ trống thì tự sinh từ tên.">
            <input name="slug" defaultValue={initial?.slug ?? ''} className="input" placeholder="hanh-dong" />
          </Field>
        )}

        {(kind === 'genre' || kind === 'platform') && (
          <Field label="Biểu tượng" hint="Một emoji, ví dụ 🎮.">
            <input name="icon" defaultValue={initial?.icon ?? ''} className="input" maxLength={8} />
          </Field>
        )}
        {kind === 'genre' && (
          <Field label="Màu">
            <input name="color" type="color" defaultValue={initial?.color ?? '#2c7bfe'} className="input h-10 !py-1" />
          </Field>
        )}

        <Field label="Thứ tự" hint="Số nhỏ đứng trước.">
          <input name="order" type="number" defaultValue={initial?.order ?? 0} className="input" />
        </Field>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary !py-1.5 disabled:opacity-60">
          {pending ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button type="button" onClick={onDone} className="btn-ghost !py-1.5">Huỷ</button>
      </div>
    </ActionForm>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs font-normal normal-case text-ink-400">{hint}</span>}
    </label>
  );
}
