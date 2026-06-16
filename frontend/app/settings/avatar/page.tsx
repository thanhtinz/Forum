'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import ImageUpload from '@/components/ImageUpload';

export default function AvatarSettings() {
  const { user, loading: authLoading } = useAuth();
  const [avatar, setAvatar] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user?.avatar) setAvatar(user.avatar);
  }, [user]);

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      await api.patch('/users/me', { avatar });
      setMsg('Đã cập nhật ảnh đại diện. Tải lại trang để thấy thay đổi ở mọi nơi.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return <p className="text-ink-500">Đang tải...</p>;
  if (!user) return <p className="text-ink-500">Vui lòng đăng nhập để chỉnh sửa ảnh đại diện.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Ảnh đại diện</h1>

      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar user={{ ...user, avatar }} size={72} />
          <p className="text-sm text-ink-500">Tải ảnh lên hoặc dán URL ảnh đại diện của bạn.</p>
        </div>

        <ImageUpload value={avatar || undefined} onUploaded={setAvatar} label="Tải ảnh đại diện" />

        <div>
          <label className="mb-1 block text-sm text-ink-500">hoặc URL ảnh</label>
          <input
            className="input w-full"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://…"
          />
        </div>

        {msg && <p className="text-sm text-brand-600">{msg}</p>}

        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </div>
  );
}
