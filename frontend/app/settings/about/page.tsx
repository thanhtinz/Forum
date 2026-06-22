'use client';

import { useEffect, useState } from 'react';
import { Cake, MapPin, UserCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface About { displayName?: string; bio?: string | null; location?: string | null; birthday?: string | null; showBirthday?: boolean }

export default function AboutSettings() {
  const { user, loading: authLoading } = useAuth();
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [birthday, setBirthday] = useState('');
  const [showBirthday, setShowBirthday] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<About>('/users/me/about').then((a) => {
      setBio(a.bio || '');
      setLocation(a.location || '');
      setBirthday(a.birthday ? a.birthday.slice(0, 10) : '');
      setShowBirthday(!!a.showBirthday);
    }).catch(() => {});
  }, []);

  async function save() {
    setBusy(true); setMsg('');
    try {
      await api.patch('/users/me', {
        bio,
        location,
        birthday: birthday || null,
        showBirthday,
      });
      setMsg('Đã lưu thông tin giới thiệu ✓');
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  if (authLoading) return <p className="text-ink-500">Đang tải...</p>;
  if (!user) return <p className="text-ink-500">Vui lòng đăng nhập để chỉnh sửa.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Giới thiệu</h1>

      <div className="card space-y-4 p-5">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><UserCircle size={15} /> Giới thiệu về bạn</label>
          <textarea
            className="input w-full"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Vài dòng giới thiệu về bản thân…"
            maxLength={1000}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><MapPin size={15} /> Nơi ở</label>
          <input
            className="input w-full"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="vd: Hà Nội, Việt Nam"
            maxLength={120}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><Cake size={15} /> Ngày sinh</label>
          <input
            type="date"
            className="input w-full"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
            <input type="checkbox" checked={showBirthday} onChange={(e) => setShowBirthday(e.target.checked)} />
            Hiển thị ngày sinh công khai trên trang cá nhân
          </label>
        </div>

        {msg && <p className="text-sm text-brand-600">{msg}</p>}

        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </div>
  );
}
