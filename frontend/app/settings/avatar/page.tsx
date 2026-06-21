'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import ImageUpload from '@/components/ImageUpload';

interface AvatarImg { id: string; name: string; imageUrl: string }
interface Pack { id: string; name: string; description?: string; avatars: AvatarImg[] }

export default function AvatarSettings() {
  const { user, loading: authLoading } = useAuth();
  const [avatar, setAvatar] = useState('');
  const [packs, setPacks] = useState<Pack[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user?.avatar) setAvatar(user.avatar);
  }, [user]);

  useEffect(() => {
    api.get<Pack[]>('/users/avatars/library').then(setPacks).catch(() => {});
  }, []);

  async function save(url?: string) {
    const value = url ?? avatar;
    setBusy(true);
    setMsg('');
    try {
      await api.patch('/users/me', { avatar: value });
      setAvatar(value);
      setMsg('Đã cập nhật ảnh đại diện. Tải lại trang để thấy thay đổi ở mọi nơi.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return <p className="text-ink-500">Đang tải...</p>;
  if (!user) return <p className="text-ink-500">Vui lòng đăng nhập để chỉnh sửa ảnh đại diện.</p>;

  const hasLibrary = packs.some((p) => p.avatars.length > 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Ảnh đại diện</h1>

      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar user={{ ...user, avatar }} size={72} />
          <p className="text-sm text-ink-500">Chọn từ thư viện avatar, tải ảnh lên hoặc dán URL ảnh đại diện của bạn.</p>
        </div>

        <ImageUpload external value={avatar || undefined} onUploaded={setAvatar} label="Tải ảnh đại diện" />

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

        <button className="btn-primary" onClick={() => save()} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>

      {/* Thư viện avatar có sẵn */}
      {hasLibrary && (
        <div className="card space-y-4 p-5">
          <div>
            <h2 className="font-semibold">Thư viện avatar</h2>
            <p className="text-sm text-ink-500">Bấm một ảnh để dùng làm ảnh đại diện ngay.</p>
          </div>
          {packs.filter((p) => p.avatars.length > 0).map((p) => (
            <div key={p.id} className="space-y-2">
              <p className="text-sm font-medium">{p.name}</p>
              <div className="flex flex-wrap gap-2.5">
                {p.avatars.map((a) => {
                  const active = avatar === a.imageUrl;
                  return (
                    <button key={a.id} onClick={() => save(a.imageUrl)} disabled={busy}
                      title={a.name}
                      className={`relative h-16 w-16 overflow-hidden rounded-full border-2 transition disabled:opacity-60 ${active ? 'border-brand-600 ring-2 ring-brand-300' : 'border-ink-200 hover:border-brand-400 dark:border-ink-700'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.imageUrl} alt={a.name} className="h-full w-full object-cover" />
                      {active && <span className="absolute inset-0 grid place-items-center bg-black/30 text-white"><Check size={20} /></span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
