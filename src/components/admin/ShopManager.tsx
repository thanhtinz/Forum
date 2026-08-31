'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { saveShopItem, deleteShopItem, type ShopAdminState } from '@/app/admin/shop/actions';
import { ActionForm } from '@/components/ActionForm';
import {
  isGradient, KIND_LABELS, SHOP_KINDS, SHOP_NAME_MAX, SHOP_DESC_MAX, SHOP_PRICE_MAX,
  type ShopItemView, type ShopKind,
} from '@/lib/shop-const';
import { soDay } from '@/lib/utils';

export function ShopManager({ items }: { items: ShopItemView[] }) {
  const [editing, setEditing] = useState<ShopItemView | null>(null);
  const [adding, setAdding] = useState(false);
  const close = () => { setEditing(null); setAdding(false); };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-500">{soDay(items.length)} món trên trang này</p>
        <button type="button" onClick={() => { setAdding((v) => !v); setEditing(null); }}
          className="btn-primary !py-1.5 text-sm">
          {adding ? <><X size={15} /> Đóng</> : <><Plus size={15} /> Thêm món</>}
        </button>
      </div>

      {(adding || editing) && <ItemForm initial={editing} onDone={close} />}

      {items.length === 0 ? (
        <p className="card p-10 text-center text-sm text-ink-400">Cửa hàng chưa có món nào.</p>
      ) : (
        <ul className="card divide-y divide-ink-100 dark:divide-ink-800">
          {items.map((it) => (
            <Row key={it.id} item={it} onEdit={() => { setEditing(it); setAdding(false); }} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ item, onEdit }: { item: ShopItemView; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <li className="flex flex-wrap items-center gap-3 p-3 sm:px-4">
      <MiniPreview item={item} />

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <b className="min-w-0 truncate">{item.name}</b>
          <span className="chip bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
            {KIND_LABELS[item.kind].label}
          </span>
          {!item.active && (
            <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-950/50">Ngừng bán</span>
          )}
        </p>
        <p className="retro-sub text-ink-400">
          {/* `break-all`: giá trị của món có thể là cả một chuỗi CSS không dấu
              cách ("linear-gradient(90deg,#f43f5e,…)"), không cho ngắt thì nó
              đẩy rộng cả trang và điện thoại cuộn ngang được. */}
          {soDay(item.pricePoints)} điểm · thứ tự {item.order} · <code className="break-all">{item.value}</code>
        </p>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <button type="button" onClick={onEdit} title="Sửa" aria-label={`Sửa món ${item.name}`}
          className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800">
          <Pencil size={15} />
        </button>
        <button type="button" disabled={pending} title="Xoá" aria-label={`Xoá món ${item.name}`}
          onClick={() => {
            if (!confirm(`Xoá “${item.name}”?`)) return;
            setError(null);
            start(async () => {
              const r = await deleteShopItem(item.id);
              if (r.error) { setError(r.error); return; }
              router.refresh();
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

function MiniPreview({ item }: { item: ShopItemView }) {
  if (item.kind === 'NAME_COLOR') {
    const style = isGradient(item.value)
      ? { backgroundImage: item.value, WebkitBackgroundClip: 'text' as const, backgroundClip: 'text' as const, color: 'transparent' }
      : { color: item.value };
    return <b className="w-14 shrink-0 text-center" style={style}>Aa</b>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.value} alt="" className="size-8 shrink-0 object-contain" />;
}

function ItemForm({ initial, onDone }: { initial: ShopItemView | null; onDone: () => void }) {
  const [state, action, pending] = useActionState<ShopAdminState, FormData>(saveShopItem, {});
  const [kind, setKind] = useState<ShopKind>(initial?.kind ?? 'NAME_COLOR');
  const [value, setValue] = useState(initial?.value ?? '#e11d48');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  if (state.ok) {
    // Lưu xong thì đóng biểu mẫu ở lượt render kế tiếp.
    queueMicrotask(() => { onDone(); router.refresh(); });
  }

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) { setUploadError(data.error ?? 'Không tải được ảnh.'); return; }
      setValue(data.url);
    } catch {
      setUploadError('Không tải được ảnh, thử lại nhé.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const isColor = kind === 'NAME_COLOR';
  const meta = KIND_LABELS[kind];

  return (
    <ActionForm action={action} className="card space-y-3 p-4 sm:p-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <fieldset>
        <legend className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Loại đồ</legend>
        <div className="flex flex-wrap gap-1.5">
          {SHOP_KINDS.map((k) => (
            <label key={k} className="cursor-pointer" title={KIND_LABELS[k].hint}>
              <input type="radio" name="kind" value={k} checked={k === kind}
                onChange={() => {
                  setKind(k);
                  // Đổi loại thì giá trị cũ vô nghĩa (màu ↔ ảnh), dọn luôn cho
                  // khỏi lưu nhầm một đường dẫn ảnh vào ô màu.
                  setValue(k === 'NAME_COLOR' ? '#e11d48' : '');
                }}
                className="peer sr-only" />
              <span className="chip bg-ink-100 text-ink-600 peer-checked:bg-brand-500 peer-checked:text-white dark:bg-ink-800 dark:text-ink-300">
                {KIND_LABELS[k].label}
              </span>
            </label>
          ))}
        </div>
        <p className="retro-sub mt-1 text-ink-400">{meta.hint}</p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên">
          <input name="name" required maxLength={SHOP_NAME_MAX} defaultValue={initial?.name ?? ''}
            className="input" placeholder={isColor ? 'Nick đỏ' : 'Khung rồng vàng'} />
        </Field>

        <Field label="Giá (điểm)">
          <input name="pricePoints" type="number" min={0} max={SHOP_PRICE_MAX}
            defaultValue={initial?.pricePoints ?? 100} className="input" />
        </Field>

        <Field label="Mô tả" hint="Không bắt buộc.">
          <input name="description" maxLength={SHOP_DESC_MAX} defaultValue={initial?.description ?? ''} className="input" />
        </Field>

        <Field label="Thứ tự" hint="Số nhỏ đứng trước.">
          <input name="order" type="number" defaultValue={initial?.order ?? 0} className="input" />
        </Field>
      </div>

      <Field label={meta.valueLabel} hint={meta.valueHint}>
        {isColor ? (
          <div className="flex flex-wrap items-center gap-2">
            <input name="value" required value={value} onChange={(e) => setValue(e.target.value)}
              className="input min-w-48 flex-1" placeholder="#e11d48" />
            {/* Ô chọn màu chỉ hiểu #hex, nên chỉ hiện khi giá trị đang là hex —
                gõ gradient vào rồi mở bảng màu là gradient bị nuốt mất. */}
            {/^#[0-9a-f]{6}$/i.test(value) && (
              <input type="color" value={value} onChange={(e) => setValue(e.target.value)}
                aria-label="Chọn màu" className="input h-10 w-16 !py-1" />
            )}
            <span className="rounded-lg bg-ink-50 px-3 py-1.5 dark:bg-ink-800/50">
              <b style={isGradient(value)
                ? { backgroundImage: value, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
                : { color: value }}>Xem trước</b>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="value" value={value} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="btn-outline !py-1.5 text-sm disabled:opacity-60">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
              {uploading ? 'Đang tải…' : value ? 'Chọn ảnh khác' : 'Chọn ảnh'}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
            {value && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="size-12 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
            )}
            {value && <code className="min-w-0 flex-1 truncate text-xs text-ink-400">{value}</code>}
          </div>
        )}
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="size-4 rounded" />
        Đang bán
      </label>

      {(uploadError || state.error) && (
        <p className="text-sm text-red-600">{uploadError ?? state.error}</p>
      )}

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
