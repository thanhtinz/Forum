'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import ImageUpload from '@/components/ImageUpload';

interface AvatarImg { id: string; name: string; imageUrl: string }
interface Pack { id: string; name: string; description?: string; avatars: AvatarImg[] }
interface OwnedFrame { id: string; frameId: string; name: string; imageUrl: string; expiresAt: string | null; expired: boolean; equipped: boolean }

export default function AvatarSettings() {
  const { user, loading: authLoading } = useAuth();
  const [avatar, setAvatar] = useState('');
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [libTab, setLibTab] = useState(0);
  const [frames, setFrames] = useState<OwnedFrame[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user?.avatar) setAvatar(user.avatar);
    setFrameUrl(user?.avatarFrameUrl ?? null);
  }, [user]);

  useEffect(() => {
    api.get<Pack[]>('/users/avatars/library').then(setPacks).catch(() => {});
  }, []);

  function loadFrames() {
    api.get<OwnedFrame[]>('/avatar-frames/inventory').then(setFrames).catch(() => {});
  }
  useEffect(() => { loadFrames(); }, []);

  async function equipFrame(frameId: string | null) {
    setBusy(true); setMsg('');
    try {
      await api.post('/avatar-frames/equip', { frameId });
      const f = frames.find((x) => x.frameId === frameId);
      setFrameUrl(frameId ? (f?.imageUrl ?? null) : null);
      setFrames((list) => list.map((x) => ({ ...x, equipped: x.frameId === frameId })));
      setMsg(frameId ? 'Đã bật khung. Tải lại trang để thấy ở mọi nơi.' : 'Đã tắt khung.');
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

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
          <Avatar user={{ ...user, avatar, avatarFrameUrl: frameUrl }} size={88} fit />
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

      {/* Thư viện avatar có sẵn — mỗi pack một tab */}
      {hasLibrary && (() => {
        const libPacks = packs.filter((p) => p.avatars.length > 0);
        const tab = Math.min(libTab, libPacks.length - 1);
        const cur = libPacks[tab];
        return (
          <div className="card space-y-4 p-5">
            <div>
              <h2 className="font-semibold">Thư viện avatar</h2>
              <p className="text-sm text-ink-500">Chọn bộ và bấm một ảnh để dùng làm ảnh đại diện ngay.</p>
            </div>
            {/* Tabs theo từng pack */}
            <div className="flex flex-wrap gap-2 border-b border-ink-200/70 pb-2 dark:border-ink-800">
              {libPacks.map((p, i) => (
                <button key={p.id} onClick={() => setLibTab(i)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${tab === i ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'}`}>
                  {p.name} <span className="opacity-70">({p.avatars.length})</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {cur?.avatars.map((a) => {
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
        );
      })()}

      {/* Kho khung avatar — bật/tắt khung đã mua */}
      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Khung avatar của tôi</h2>
            <p className="text-sm text-ink-500">Bật/tắt khung đã mua. Mua thêm ở <a href="/game/shop?tab=frame" className="text-brand-600 hover:underline">Cửa hàng</a>.</p>
          </div>
          {frameUrl && <button onClick={() => equipFrame(null)} disabled={busy} className="btn-outline !py-1.5 text-xs">Tắt khung</button>}
        </div>
        {frames.length === 0 ? (
          <p className="text-sm text-ink-500">Bạn chưa có khung nào. Ghé <a href="/game/shop?tab=frame" className="text-brand-600 hover:underline">Cửa hàng → Khung avatar</a>.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {frames.map((f) => (
              <button key={f.id} onClick={() => !f.expired && equipFrame(f.frameId)} disabled={busy || f.expired}
                title={f.name}
                className={`relative flex w-24 flex-col items-center gap-1 rounded-xl border-2 p-2 transition disabled:opacity-50 ${f.equipped ? 'border-brand-600 ring-2 ring-brand-300' : 'border-ink-200 hover:border-brand-400 dark:border-ink-700'}`}>
                <Avatar user={{ username: user.username, avatar, avatarFrameUrl: f.imageUrl }} size={56} />
                <span className="line-clamp-1 text-xs font-medium">{f.name}</span>
                <span className="text-[10px] text-ink-400">{f.expired ? 'Hết hạn' : f.expiresAt ? `Đến ${new Date(f.expiresAt).toLocaleDateString('vi')}` : 'Vĩnh viễn'}</span>
                {f.equipped && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} /></span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
