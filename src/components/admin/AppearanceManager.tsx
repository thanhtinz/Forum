'use client';

import { useState, useTransition, useEffect } from 'react';
import { useActionState } from 'react';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, ImageIcon, Link2 } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { ImageField } from '@/components/ImageField';
import {
  saveSlide, deleteSlide, toggleSlide,
  saveFriendLink, deleteFriendLink, toggleFriendLink,
  type AppearanceState,
} from '@/app/admin/actions';

export interface SlideRow {
  id: string; title: string; subtitle: string | null; image: string; link: string | null; order: number; active: boolean;
}
export interface FriendLinkRow {
  id: string; name: string; url: string; logo: string | null; description: string | null; order: number; active: boolean;
}

// ─────────────── Slide trang chủ ───────────────

export function SlideManager({ slides }: { slides: SlideRow[] }) {
  const [editing, setEditing] = useState<SlideRow | null>(null);
  const [creating, setCreating] = useState(false);
  const close = () => { setCreating(false); setEditing(null); };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-ink-900 dark:text-white">Slide trang chủ</h2>
          <p className="text-sm text-ink-500">Ảnh lớn hiển thị đầu trang chủ. Slide đầu tiên làm ảnh chính.</p>
        </div>
        {!creating && !editing && (
          <button type="button" onClick={() => setCreating(true)} className="btn-primary !px-3 !py-1.5 text-sm"><Plus size={15} /> Thêm slide</button>
        )}
      </div>

      {(creating || editing) && <SlideForm key={editing?.id ?? 'new'} initial={editing} onDone={close} />}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {slides.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Chưa có slide nào.</div>}
        {slides.map((s) => (
          <SlideRowView key={s.id} slide={s} onEdit={() => { setEditing(s); setCreating(false); }} />
        ))}
      </div>
    </section>
  );
}

function SlideRowView({ slide, onEdit }: { slide: SlideRow; onEdit: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-3 p-3 ${slide.active ? '' : 'opacity-60'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slide.image} alt="" className="h-10 w-16 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink-900 dark:text-white">{slide.title}</div>
        <div className="truncate text-xs text-ink-400">{slide.subtitle || slide.link || '—'} · thứ tự {slide.order}</div>
      </div>
      <RowActions
        pending={pending}
        active={slide.active}
        onToggle={() => start(() => toggleSlide(slide.id))}
        onEdit={onEdit}
        onDelete={() => { if (confirm(`Xoá slide “${slide.title}”?`)) start(() => deleteSlide(slide.id)); }}
      />
    </div>
  );
}

function SlideForm({ initial, onDone }: { initial: SlideRow | null; onDone: () => void }) {
  const [state, action, pending] = useActionState<AppearanceState, FormData>(saveSlide, {});
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <FormHeader title={initial ? 'Sửa slide' : 'Thêm slide'} icon={<ImageIcon size={16} />} onDone={onDone} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-medium">Tiêu đề</span>
          <input name="title" required defaultValue={initial?.title} className="input" placeholder="Chào mừng đến Nova" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Mô tả phụ</span>
          <input name="subtitle" defaultValue={initial?.subtitle ?? ''} className="input" placeholder="Không bắt buộc" /></label>
        <ImageField className="sm:col-span-2" name="image" label="Ảnh nền" required
          defaultValue={initial?.image} placeholder="https://…/banner.jpg hoặc tải ảnh lên"
          hint="Nên dùng ảnh ngang, tối đa 5MB." />
        <label className="block"><span className="mb-1 block text-sm font-medium">Liên kết khi bấm</span>
          <input name="link" defaultValue={initial?.link ?? ''} className="input" placeholder="/forum/gop-y" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Thứ tự</span>
          <input name="order" type="number" defaultValue={initial?.order ?? 0} className="input" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={initial ? initial.active : true} className="size-4 rounded" /> Hiển thị
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <FormButtons pending={pending} onDone={onDone} />
    </ActionForm>
  );
}

// ─────────────── Liên kết bạn bè ───────────────

export function FriendLinkManager({ links }: { links: FriendLinkRow[] }) {
  const [editing, setEditing] = useState<FriendLinkRow | null>(null);
  const [creating, setCreating] = useState(false);
  const close = () => { setCreating(false); setEditing(null); };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-ink-900 dark:text-white">Liên kết bạn bè</h2>
          <p className="text-sm text-ink-500">Hiển thị ở chân trang, dùng để trao đổi liên kết với site khác.</p>
        </div>
        {!creating && !editing && (
          <button type="button" onClick={() => setCreating(true)} className="btn-primary !px-3 !py-1.5 text-sm"><Plus size={15} /> Thêm liên kết</button>
        )}
      </div>

      {(creating || editing) && <FriendLinkForm key={editing?.id ?? 'new'} initial={editing} onDone={close} />}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {links.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Chưa có liên kết nào.</div>}
        {links.map((l) => (
          <FriendLinkRowView key={l.id} link={l} onEdit={() => { setEditing(l); setCreating(false); }} />
        ))}
      </div>
    </section>
  );
}

function FriendLinkRowView({ link, onEdit }: { link: FriendLinkRow; onEdit: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-3 p-3 ${link.active ? '' : 'opacity-60'}`}>
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
        {link.logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={link.logo} alt="" className="size-9 object-cover" />
          : <Link2 size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink-900 dark:text-white">{link.name}</div>
        <div className="truncate text-xs text-ink-400">{link.url}</div>
      </div>
      <RowActions
        pending={pending}
        active={link.active}
        onToggle={() => start(() => toggleFriendLink(link.id))}
        onEdit={onEdit}
        onDelete={() => { if (confirm(`Xoá liên kết “${link.name}”?`)) start(() => deleteFriendLink(link.id)); }}
      />
    </div>
  );
}

function FriendLinkForm({ initial, onDone }: { initial: FriendLinkRow | null; onDone: () => void }) {
  const [state, action, pending] = useActionState<AppearanceState, FormData>(saveFriendLink, {});
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <FormHeader title={initial ? 'Sửa liên kết' : 'Thêm liên kết'} icon={<Link2 size={16} />} onDone={onDone} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-medium">Tên site</span>
          <input name="name" required defaultValue={initial?.name} className="input" placeholder="Blog ABC" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Địa chỉ</span>
          <input name="url" required defaultValue={initial?.url} className="input" placeholder="https://example.com" /></label>
        <ImageField className="sm:col-span-2" name="logo" label="Logo" shape="square"
          defaultValue={initial?.logo} placeholder="https://…/logo.png hoặc tải ảnh lên" />
        <label className="block"><span className="mb-1 block text-sm font-medium">Thứ tự</span>
          <input name="order" type="number" defaultValue={initial?.order ?? 0} className="input" /></label>
      </div>
      <label className="block"><span className="mb-1 block text-sm font-medium">Mô tả</span>
        <input name="description" defaultValue={initial?.description ?? ''} className="input" placeholder="Không bắt buộc" /></label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={initial ? initial.active : true} className="size-4 rounded" /> Hiển thị
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <FormButtons pending={pending} onDone={onDone} />
    </ActionForm>
  );
}

// ─────────────── Dùng chung ───────────────

function RowActions({ pending, active, onToggle, onEdit, onDelete }: {
  pending: boolean; active: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <button type="button" disabled={pending} onClick={onToggle} title={active ? 'Ẩn' : 'Hiện'}
        className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-800">
        {active ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button type="button" onClick={onEdit} title="Sửa"
        className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"><Pencil size={14} /></button>
      <button type="button" disabled={pending} onClick={onDelete} title="Xoá"
        className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950"><Trash2 size={14} /></button>
    </div>
  );
}

function FormHeader({ title, icon, onDone }: { title: string; icon: React.ReactNode; onDone: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-1.5 font-bold">{icon} {title}</h3>
      <button type="button" onClick={onDone} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
    </div>
  );
}

function FormButtons({ pending, onDone }: { pending: boolean; onDone: () => void }) {
  return (
    <div className="flex gap-2">
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Lưu'}</button>
      <button type="button" onClick={onDone} className="btn-ghost">Huỷ</button>
    </div>
  );
}
