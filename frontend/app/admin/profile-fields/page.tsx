'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Pencil, X } from 'lucide-react';

interface ProfileField {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
}

const TYPES = ['text', 'textarea', 'url', 'select'];

const emptyForm = {
  key: '',
  label: '',
  type: 'text',
  options: '',
  required: false,
  sortOrder: 0,
};

export default function AdminProfileFields() {
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get<ProfileField[]>('/profile-extra/admin/fields')
      .then(setFields)
      .catch((e) => setMsg(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function openEdit(f: ProfileField) {
    setEditId(f.id);
    setForm({
      key: f.key,
      label: f.label,
      type: f.type,
      options: Array.isArray(f.options) ? f.options.join('\n') : '',
      required: f.required,
      sortOrder: f.sortOrder,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const payload = {
        key: form.key,
        label: form.label,
        type: form.type,
        options:
          form.type === 'select'
            ? form.options
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
            : null,
        required: form.required,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editId) {
        await api.patch(`/profile-extra/admin/fields/${editId}`, payload);
        setMsg('Đã cập nhật trường hồ sơ.');
      } else {
        await api.post('/profile-extra/admin/fields', payload);
        setMsg('Đã tạo trường hồ sơ.');
      }
      closeForm();
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Xóa trường hồ sơ này?')) return;
    try {
      await api.del(`/profile-extra/admin/fields/${id}`);
      setMsg('Đã xóa.');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trường hồ sơ tùy chỉnh</h1>
        <button className="btn-primary flex items-center gap-1" onClick={openCreate}>
          <Plus size={16} /> Thêm trường
        </button>
      </div>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {showForm && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              {editId ? 'Sửa trường hồ sơ' : 'Tạo trường hồ sơ mới'}
            </h2>
            <button type="button" onClick={closeForm} className="text-ink-500">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-ink-500">Nhãn hiển thị</label>
              <input
                className="input"
                placeholder="VD: Trang web cá nhân"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink-500">Khóa (key, duy nhất)</label>
              <input
                className="input"
                placeholder="VD: website"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink-500">Kiểu</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {form.type === 'select' && (
              <div>
                <label className="mb-1 block text-sm text-ink-500">
                  Tùy chọn (mỗi dòng một mục)
                </label>
                <textarea
                  className="input min-h-24"
                  placeholder={'Lựa chọn 1\nLựa chọn 2'}
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm text-ink-500">Thứ tự sắp xếp</label>
              <input
                className="input"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
              />
              Bắt buộc
            </label>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={busy}>
                {busy ? '...' : editId ? 'Lưu' : 'Tạo'}
              </button>
              <button type="button" className="btn-outline" onClick={closeForm}>
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200/70 text-left text-ink-500 dark:border-ink-800">
            <tr>
              <th className="p-3">Nhãn</th>
              <th className="p-3">Khóa</th>
              <th className="p-3">Kiểu</th>
              <th className="p-3">Bắt buộc</th>
              <th className="p-3">Thứ tự</th>
              <th className="p-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id} className="border-b border-ink-100 dark:border-ink-800">
                <td className="p-3 font-medium">{f.label}</td>
                <td className="p-3">
                  <code className="rounded bg-ink-100 px-2 py-0.5 font-mono text-xs dark:bg-ink-800">
                    {f.key}
                  </code>
                </td>
                <td className="p-3">{f.type}</td>
                <td className="p-3">{f.required ? 'Có' : 'Không'}</td>
                <td className="p-3">{f.sortOrder}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(f)}
                      className="btn-outline !p-1.5"
                      title="Sửa"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(f.id)}
                      className="btn-outline !p-1.5 text-red-600"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-ink-500">
                  Chưa có trường hồ sơ nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
