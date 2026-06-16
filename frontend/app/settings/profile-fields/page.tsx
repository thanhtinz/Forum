'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface ProfileField {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
}

interface UserFieldValue {
  field: ProfileField;
  value: string;
}

export default function MyProfileFields() {
  const { user, loading: authLoading } = useAuth();
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<ProfileField[]>('/profile-extra/fields'),
      api.get<UserFieldValue[]>(`/profile-extra/users/${user.id}/fields`),
    ])
      .then(([fs, vals]) => {
        setFields(fs);
        const map: Record<string, string> = {};
        for (const v of vals) map[v.field.id] = v.value ?? '';
        setValues(map);
      })
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  function setVal(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api.post('/profile-extra/my-fields', {
        values: fields.map((f) => ({ fieldId: f.id, value: values[f.id] ?? '' })),
      });
      setMsg('Đã lưu thông tin hồ sơ.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) {
    return <p className="text-ink-500">Đang tải...</p>;
  }

  if (!user) {
    return <p className="text-ink-500">Vui lòng đăng nhập để chỉnh sửa hồ sơ.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Thông tin hồ sơ tùy chỉnh</h1>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {fields.length === 0 ? (
        <p className="text-ink-500">Chưa có trường hồ sơ nào được cấu hình.</p>
      ) : (
        <form onSubmit={save} className="card space-y-4 p-4">
          {fields.map((f) => (
            <div key={f.id}>
              <label className="mb-1 block text-sm text-ink-500">
                {f.label}
                {f.required && <span className="text-red-600"> *</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  className="input min-h-24"
                  value={values[f.id] ?? ''}
                  onChange={(e) => setVal(f.id, e.target.value)}
                  required={f.required}
                />
              ) : f.type === 'select' ? (
                <select
                  className="input"
                  value={values[f.id] ?? ''}
                  onChange={(e) => setVal(f.id, e.target.value)}
                  required={f.required}
                >
                  <option value="">-- Chọn --</option>
                  {(f.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  type={f.type === 'url' ? 'url' : 'text'}
                  value={values[f.id] ?? ''}
                  onChange={(e) => setVal(f.id, e.target.value)}
                  required={f.required}
                />
              )}
            </div>
          ))}
          <button className="btn-primary" disabled={busy}>
            {busy ? '...' : 'Lưu'}
          </button>
        </form>
      )}
    </div>
  );
}
