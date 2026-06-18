'use client';

import { useEffect, useState } from 'react';
import { FolderTree, Plus, Trash2, Pencil, Briefcase, X, Tags } from 'lucide-react';
import { api } from '@/lib/api';

interface Prefix { id: string; label: string; color?: string | null; sortOrder?: number }

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder: number;
  moduleType: string;
  threadCount?: number;
  _count?: { threads: number };
}

const MODULES: { value: string; label: string }[] = [
  { value: 'NONE', label: 'Thường (diễn đàn)' },
  { value: 'JOB', label: 'Việc làm (freelance)' },
];

const EMPTY = { name: '', slug: '', description: '', icon: '', color: '', sortOrder: 0, moduleType: 'NONE' };

export default function AdminForumCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // Quản lý tiền tố theo danh mục
  const [prefixCat, setPrefixCat] = useState<Category | null>(null);
  const [prefixes, setPrefixes] = useState<Prefix[]>([]);
  const [newPrefix, setNewPrefix] = useState({ label: '', color: '#6366f1' });

  function openPrefixes(c: Category) {
    setPrefixCat(c);
    api.get<Prefix[]>(`/forum/categories/${c.id}/prefixes`).then(setPrefixes).catch(() => setPrefixes([]));
    setNewPrefix({ label: '', color: '#6366f1' });
  }
  async function addPrefix() {
    if (!prefixCat || !newPrefix.label.trim()) return;
    await api.post(`/forum/admin/categories/${prefixCat.id}/prefixes`, { label: newPrefix.label.trim(), color: newPrefix.color });
    setNewPrefix({ label: '', color: '#6366f1' });
    api.get<Prefix[]>(`/forum/categories/${prefixCat.id}/prefixes`).then(setPrefixes).catch(() => {});
  }
  async function removePrefix(id: string) {
    await api.del(`/forum/admin/prefixes/${id}`).catch(() => {});
    setPrefixes((p) => p.filter((x) => x.id !== id));
  }

  function load() {
    setLoading(true);
    api.get<Category[]>('/forum/admin/categories')
      .then(setCats)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
    setErr('');
  }
  function openEdit(c: Category) {
    setEditing(c);
    setForm({
      name: c.name, slug: c.slug, description: c.description || '', icon: c.icon || '',
      color: c.color || '', sortOrder: c.sortOrder, moduleType: c.moduleType || 'NONE',
    });
    setShowForm(true);
    setErr('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description,
        icon: form.icon,
        color: form.color,
        sortOrder: Number(form.sortOrder) || 0,
        moduleType: form.moduleType,
      };
      if (editing) await api.post(`/forum/admin/categories/${editing.id}`, payload);
      else await api.post('/forum/admin/categories', payload);
      setShowForm(false);
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove(c: Category) {
    if (!confirm(`Xoá danh mục "${c.name}"?`)) return;
    try { await api.del(`/forum/admin/categories/${c.id}`); load(); }
    catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><FolderTree size={22} /> Danh mục diễn đàn</h1>
        <button onClick={openNew} className="btn-primary inline-flex items-center gap-1 text-sm"><Plus size={16} /> Thêm danh mục</button>
      </div>

      <p className="text-sm text-ink-500">
        Đánh dấu một danh mục là <strong>module Việc làm</strong> để các bài đăng trong danh mục đó có thêm tính năng tuyển dụng:
        ngân sách, đề xuất ứng tuyển, ký quỹ (escrow) và đánh giá.
      </p>

      {loading && <div className="p-10 text-center text-ink-500">Đang tải…</div>}

      {!loading && (
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {cats.length === 0 && <div className="p-8 text-center text-ink-500">Chưa có danh mục nào.</div>}
          {cats.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.name}</span>
                  {c.moduleType === 'JOB' && (
                    <span className="chip inline-flex items-center gap-1 bg-emerald-100 text-emerald-700"><Briefcase size={12} /> Việc làm</span>
                  )}
                </div>
                <div className="text-xs text-ink-500">/{c.slug} · {c._count?.threads ?? c.threadCount ?? 0} bài · thứ tự {c.sortOrder}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openPrefixes(c)} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm"><Tags size={14} /> Tiền tố</button>
                <button onClick={() => openEdit(c)} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm"><Pencil size={14} /> Sửa</button>
                <button onClick={() => remove(c)} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm text-red-500"><Trash2 size={14} /> Xoá</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="card w-full max-w-lg space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-ink-400 hover:text-ink-600"><X size={20} /></button>
            </div>
            <label className="block text-sm">Tên danh mục
              <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="block text-sm">Slug (để trống = tự tạo)
              <input className="input mt-1" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="vd: viec-lam" />
            </label>
            <label className="block text-sm">Mô tả
              <textarea className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-sm">Icon
                <input className="input mt-1" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="emoji/tên" />
              </label>
              <label className="block text-sm">Màu
                <input className="input mt-1" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#3b82f6" />
              </label>
              <label className="block text-sm">Thứ tự
                <input type="number" className="input mt-1" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </label>
            </div>
            <label className="block text-sm">Module đặc biệt
              <select className="input mt-1" value={form.moduleType} onChange={(e) => setForm({ ...form, moduleType: e.target.value })}>
                {MODULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            {form.moduleType === 'JOB' && (
              <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Briefcase size={12} className="mr-1 inline" /> Bài đăng trong danh mục này sẽ có thêm: ngân sách, đề xuất ứng tuyển, ký quỹ &amp; đánh giá.
              </p>
            )}
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Huỷ</button>
              <button className="btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal quản lý tiền tố theo danh mục */}
      {prefixCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPrefixCat(null)}>
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-md space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Tags size={18} /> Tiền tố · {prefixCat.name}</h2>
              <button onClick={() => setPrefixCat(null)} className="text-ink-400 hover:text-ink-600"><X size={20} /></button>
            </div>
            <p className="text-sm text-ink-500">Tạo tiền tố riêng cho danh mục này. Người đăng bài sẽ chọn từ danh sách bên dưới.</p>

            <div className="space-y-1.5">
              {prefixes.length === 0 && <p className="text-sm text-ink-400">Chưa có tiền tố nào.</p>}
              {prefixes.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-ink-200/70 p-2 dark:border-ink-800">
                  <span className="chip text-white" style={{ backgroundColor: p.color || '#6366f1' }}>{p.label}</span>
                  <button onClick={() => removePrefix(p.id)} className="text-red-500 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-ink-200/70 pt-3 dark:border-ink-800">
              <input className="input flex-1" placeholder="Nhãn tiền tố (vd: Miễn phí)" value={newPrefix.label}
                onChange={(e) => setNewPrefix({ ...newPrefix, label: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addPrefix()} />
              <input type="color" className="h-9 w-10 cursor-pointer rounded border border-ink-300 dark:border-ink-700" value={newPrefix.color}
                onChange={(e) => setNewPrefix({ ...newPrefix, color: e.target.value })} />
              <button onClick={addPrefix} className="btn-primary !px-3"><Plus size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
